-- ShiftPilot — combined initial migration (schema + RLS + seed)
-- Paste into Supabase SQL Editor for project jvhfmvkttgteiopwohkn
-- Safe to run once on an empty database.

-- ============================================================
-- supabase/migrations/0001_schema.sql
-- ============================================================
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

-- ============================================================
-- supabase/migrations/0002_rls.sql
-- ============================================================
-- =============================================================================
-- ShiftPilot — Row Level Security Policies
-- Run after 0001_schema.sql
-- =============================================================================

-- ── Admin helper ──────────────────────────────────────────────────────────────
-- Returns true if the current authenticated user has is_admin = true.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

-- ── Enable RLS on every table ─────────────────────────────────────────────────
ALTER TABLE profiles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_station_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_windows       ENABLE ROW LEVEL SECURITY;
ALTER TABLE desired_blocks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings_entries           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_config            ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- profiles — PK is auth.uid()
-- =============================================================================
CREATE POLICY "profiles: own row select"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles: own row insert"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: own row update"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: own row delete"
  ON profiles FOR DELETE
  USING (auth.uid() = id);

-- Admin can read all profiles (for admin panel)
CREATE POLICY "profiles: admin read all"
  ON profiles FOR SELECT
  USING (is_admin());

-- Admin can update is_admin flag (and only that — business logic enforces scope)
CREATE POLICY "profiles: admin update"
  ON profiles FOR UPDATE
  USING (is_admin());

-- =============================================================================
-- stations — public read for authenticated users; admin-only mutations
-- =============================================================================
CREATE POLICY "stations: authenticated read"
  ON stations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "stations: admin insert"
  ON stations FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "stations: admin update"
  ON stations FOR UPDATE
  USING (is_admin());

CREATE POLICY "stations: admin delete"
  ON stations FOR DELETE
  USING (is_admin());

-- =============================================================================
-- driver_station_preferences
-- =============================================================================
CREATE POLICY "dsp: own rows select"
  ON driver_station_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "dsp: own rows insert"
  ON driver_station_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "dsp: own rows update"
  ON driver_station_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "dsp: own rows delete"
  ON driver_station_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- availability_windows
-- =============================================================================
CREATE POLICY "aw: own rows select"
  ON availability_windows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "aw: own rows insert"
  ON availability_windows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "aw: own rows update"
  ON availability_windows FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "aw: own rows delete"
  ON availability_windows FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- desired_blocks
-- =============================================================================
CREATE POLICY "db: own rows select"
  ON desired_blocks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "db: own rows insert"
  ON desired_blocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "db: own rows update"
  ON desired_blocks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "db: own rows delete"
  ON desired_blocks FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- opportunity_logs
-- =============================================================================
CREATE POLICY "ol: own rows select"
  ON opportunity_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "ol: own rows insert"
  ON opportunity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ol: own rows update"
  ON opportunity_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ol: own rows delete"
  ON opportunity_logs FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- earnings_entries
-- =============================================================================
CREATE POLICY "ee: own rows select"
  ON earnings_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "ee: own rows insert"
  ON earnings_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ee: own rows update"
  ON earnings_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ee: own rows delete"
  ON earnings_entries FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- notification_preferences — PK is user_id (same as auth.uid())
-- =============================================================================
CREATE POLICY "np: own row select"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "np: own row insert"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "np: own row update"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "np: own row delete"
  ON notification_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- notification_events
-- =============================================================================
CREATE POLICY "ne: own rows select"
  ON notification_events FOR SELECT
  USING (auth.uid() = user_id);

-- Users cannot INSERT notification_events directly — only service role can.
-- (No INSERT policy for authenticated role.)

-- Admin can read all notification events
CREATE POLICY "ne: admin read all"
  ON notification_events FOR SELECT
  USING (is_admin());

-- =============================================================================
-- audit_logs — append-only. Admins read. No client INSERT.
-- =============================================================================
CREATE POLICY "al: admin read all"
  ON audit_logs FOR SELECT
  USING (is_admin());

-- No INSERT policy for authenticated users — inserts go through service role only.
-- No UPDATE policy — append-only.
-- No DELETE policy — append-only.

-- =============================================================================
-- platform_config
-- =============================================================================
CREATE POLICY "pc: authenticated read"
  ON platform_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "pc: admin insert"
  ON platform_config FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "pc: admin update"
  ON platform_config FOR UPDATE
  USING (is_admin());

CREATE POLICY "pc: admin delete"
  ON platform_config FOR DELETE
  USING (is_admin());

-- ============================================================
-- supabase/migrations/0003_seed.sql
-- ============================================================
-- =============================================================================
-- ShiftPilot — Seed Data
-- Example stations and platform_config rows.
-- These are SAMPLE records. Replace or extend with real station data.
-- Run after 0001_schema.sql and 0002_rls.sql.
-- =============================================================================

-- ── Example Stations ─────────────────────────────────────────────────────────
-- Amazon Flex stations (Miami)
INSERT INTO stations (id, code, name, city, state, country, lat, lon, platform, active) VALUES
  (gen_random_uuid(), 'DMI5',  'Amazon DSP Miami Opa-locka',   'Opa-locka',   'FL', 'US', 25.8999, -80.2499, 'amazon_flex', true),
  (gen_random_uuid(), 'DMI2',  'Amazon DSP Miami Doral',       'Doral',       'FL', 'US', 25.8194, -80.3506, 'amazon_flex', true),
  (gen_random_uuid(), 'DMIA',  'Amazon Flex Miami Airport',    'Miami',       'FL', 'US', 25.7952, -80.2870, 'amazon_flex', true),

-- Amazon Flex stations (NYC)
  (gen_random_uuid(), 'DNYC1', 'Amazon DSP Brooklyn Navy Yard','Brooklyn',    'NY', 'US', 40.6988, -73.9731, 'amazon_flex', true),
  (gen_random_uuid(), 'DNYC2', 'Amazon DSP Woodside Queens',   'Woodside',    'NY', 'US', 40.7490, -73.9024, 'amazon_flex', true),

-- Amazon Flex stations (LA)
  (gen_random_uuid(), 'DLAX1', 'Amazon DSP Los Angeles South', 'Compton',     'CA', 'US', 33.8985, -118.2437, 'amazon_flex', true),
  (gen_random_uuid(), 'DLAX2', 'Amazon DSP Hollywood',         'Los Angeles', 'CA', 'US', 34.0928, -118.3287, 'amazon_flex', true),

-- Amazon Flex stations (Chicago)
  (gen_random_uuid(), 'DCHI1', 'Amazon DSP Chicago Pilsen',    'Chicago',     'IL', 'US', 41.8543, -87.6656, 'amazon_flex', true),

-- Uber Eats zones (example city zones — not tied to a physical warehouse)
  (gen_random_uuid(), 'UE-MIA-BRICKELL', 'Uber Eats Zone: Brickell/Downtown Miami', 'Miami',       'FL', 'US', 25.7616, -80.1918, 'uber_eats', true),
  (gen_random_uuid(), 'UE-NYC-MIDTOWN',  'Uber Eats Zone: Midtown Manhattan',        'New York',    'NY', 'US', 40.7549, -73.9840, 'uber_eats', true),
  (gen_random_uuid(), 'UE-CHI-LOOP',     'Uber Eats Zone: The Loop Chicago',         'Chicago',     'IL', 'US', 41.8827, -87.6233, 'uber_eats', true),

-- DoorDash zones
  (gen_random_uuid(), 'DD-MIA-NW',       'DoorDash Zone: NW Miami',                  'Miami',       'FL', 'US', 25.8422, -80.2498, 'doordash',  true),
  (gen_random_uuid(), 'DD-LA-WESTSIDE',  'DoorDash Zone: LA Westside',               'Los Angeles', 'CA', 'US', 34.0158, -118.4952, 'doordash', true)
ON CONFLICT (code) DO NOTHING;

-- ── Platform Config ───────────────────────────────────────────────────────────
INSERT INTO platform_config (key, value, updated_at) VALUES
  ('default_min_pay_per_hour_cents',
   '2500',
   now()),
  ('default_min_block_minutes',
   '120',
   now()),
  ('welcome_message',
   '"Welcome to ShiftPilot — your personal gig-shift planner. Log your opportunities, track your earnings, and get timely reminders about your own open windows. You always act on your apps yourself."',
   now()),
  ('disclaimer_text',
   '"ShiftPilot is a personal planning tool. It does not connect to, log into, scrape, or act on Amazon Flex, Uber Eats, DoorDash, Instacart, or any other gig platform on your behalf. All actions on those platforms are taken by you."',
   now()),
  ('notification_dispatch_enabled',
   'true',
   now())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

