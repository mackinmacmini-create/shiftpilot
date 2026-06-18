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
