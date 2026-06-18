-- =============================================================================
-- ShiftPilot — Initial Schema
-- Run: supabase db push  OR  psql -f 0001_schema.sql
-- =============================================================================

-- ── Utility: updated_at trigger ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── 1. profiles ───────────────────────────────────────────────────────────────
-- One row per auth user. NO credential fields for external gig platforms.
CREATE TABLE IF NOT EXISTS profiles (
  id               uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name     text,
  home_city        text,
  home_state       text,
  home_country     text NOT NULL DEFAULT 'US',
  timezone         text NOT NULL DEFAULT 'America/New_York',
  vehicle_type     text,
  -- Informational only. This value is NEVER used to authenticate with any platform.
  primary_platform text CHECK (primary_platform IN ('amazon_flex','uber_eats','doordash','instacart','other') OR primary_platform IS NULL),
  is_admin         boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 2. stations ───────────────────────────────────────────────────────────────
-- Public lookup table of pickup locations/zones. Admin-managed.
CREATE TABLE IF NOT EXISTS stations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text NOT NULL UNIQUE,
  name       text NOT NULL,
  city       text NOT NULL,
  state      text,
  country    text NOT NULL DEFAULT 'US',
  lat        numeric(10,7),
  lon        numeric(10,7),
  platform   text NOT NULL,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stations_platform ON stations(platform);
CREATE INDEX idx_stations_active   ON stations(active);

-- ── 3. driver_station_preferences ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_station_preferences (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  station_id uuid NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  priority   smallint NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, station_id)
);

CREATE INDEX idx_dsp_user_id    ON driver_station_preferences(user_id);
CREATE INDEX idx_dsp_station_id ON driver_station_preferences(station_id);

-- ── 4. availability_windows ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS availability_windows (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_at         timestamptz NOT NULL,
  end_at           timestamptz NOT NULL,
  recurrence_rule  text,     -- RRULE string (RFC 5545)
  label            text,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aw_end_after_start CHECK (end_at > start_at)
);

CREATE TRIGGER availability_windows_updated_at
  BEFORE UPDATE ON availability_windows
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_aw_user_id  ON availability_windows(user_id);
CREATE INDEX idx_aw_start_at ON availability_windows(start_at);

-- ── 5. desired_blocks ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS desired_blocks (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  station_id           uuid REFERENCES stations(id) ON DELETE SET NULL,
  day_of_week          smallint CHECK (day_of_week BETWEEN 0 AND 6),
  start_time           time,
  end_time             time,
  min_pay_cents        integer CHECK (min_pay_cents IS NULL OR min_pay_cents >= 0),
  min_duration_minutes integer CHECK (min_duration_minutes IS NULL OR min_duration_minutes > 0),
  notes                text,
  is_active            boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER desired_blocks_updated_at
  BEFORE UPDATE ON desired_blocks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_db_user_id ON desired_blocks(user_id);

-- ── 6. opportunity_logs ───────────────────────────────────────────────────────
-- Manual journal only. User types in what they saw/grabbed.
CREATE TABLE IF NOT EXISTS opportunity_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  station_id       uuid REFERENCES stations(id) ON DELETE SET NULL,
  observed_at      timestamptz NOT NULL DEFAULT now(),
  start_at         timestamptz NOT NULL,
  end_at           timestamptz NOT NULL,
  offered_pay_cents integer NOT NULL CHECK (offered_pay_cents >= 0),
  outcome          text NOT NULL CHECK (outcome IN ('grabbed','passed','missed','cancelled')),
  source           text NOT NULL DEFAULT 'manual' CHECK (source IN ('app','reminder','manual')),
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ol_end_after_start CHECK (end_at > start_at)
);

CREATE INDEX idx_ol_user_id     ON opportunity_logs(user_id);
CREATE INDEX idx_ol_observed_at ON opportunity_logs(observed_at);

-- ── 7. earnings_entries ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS earnings_entries (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_log_id  uuid REFERENCES opportunity_logs(id) ON DELETE SET NULL,
  station_id          uuid REFERENCES stations(id) ON DELETE SET NULL,
  worked_at           date NOT NULL,
  start_at            timestamptz NOT NULL,
  end_at              timestamptz NOT NULL,
  gross_cents         integer NOT NULL CHECK (gross_cents >= 0),
  tips_cents          integer NOT NULL DEFAULT 0 CHECK (tips_cents >= 0),
  mileage             numeric(8,2),
  platform            text NOT NULL,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ee_end_after_start CHECK (end_at > start_at)
);

CREATE INDEX idx_ee_user_id   ON earnings_entries(user_id);
CREATE INDEX idx_ee_worked_at ON earnings_entries(worked_at);

-- ── 8. notification_preferences ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id                  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  push_enabled             boolean NOT NULL DEFAULT true,
  email_enabled            boolean NOT NULL DEFAULT false,
  sms_enabled              boolean NOT NULL DEFAULT false, -- placeholder, not yet active
  quiet_hours_start        time,
  quiet_hours_end          time,
  min_minutes_before_window integer NOT NULL DEFAULT 15 CHECK (min_minutes_before_window >= 0),
  frequency_cap_per_hour   integer NOT NULL DEFAULT 4 CHECK (frequency_cap_per_hour > 0),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 9. notification_events ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_events (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel   text NOT NULL CHECK (channel IN ('push','email','sms','in_app')),
  kind      text NOT NULL CHECK (kind IN ('window_reminder','wishlist_match','daily_summary')),
  payload   jsonb NOT NULL DEFAULT '{}',
  sent_at   timestamptz NOT NULL DEFAULT now(),
  delivered boolean,
  error     text
);

CREATE INDEX idx_ne_user_id ON notification_events(user_id);
CREATE INDEX idx_ne_sent_at ON notification_events(sent_at);

-- ── 10. audit_logs ────────────────────────────────────────────────────────────
-- Append-only. No UPDATE or DELETE policies. Service role writes via helper.
CREATE TABLE IF NOT EXISTS audit_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id  uuid,   -- nullable for system actions
  action         text NOT NULL,
  entity_type    text NOT NULL,
  entity_id      uuid,
  metadata       jsonb NOT NULL DEFAULT '{}',
  ip             inet,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_al_actor_user_id ON audit_logs(actor_user_id);
CREATE INDEX idx_al_created_at    ON audit_logs(created_at DESC);
CREATE INDEX idx_al_entity        ON audit_logs(entity_type, entity_id);

-- ── 11. platform_config ───────────────────────────────────────────────────────
-- Global key-value config. Admin-writable only.
CREATE TABLE IF NOT EXISTS platform_config (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
