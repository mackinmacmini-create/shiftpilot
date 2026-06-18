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
