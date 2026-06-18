// =============================================================================
// ShiftPilot — Database TypeScript types
// Matches schema in supabase/migrations/0001_schema.sql
// =============================================================================

export type Platform =
  | "amazon_flex"
  | "uber_eats"
  | "doordash"
  | "instacart"
  | "other";

export type OpportunityOutcome = "grabbed" | "passed" | "missed" | "cancelled";
export type OpportunitySource = "app" | "reminder" | "manual";
export type NotificationChannel = "push" | "email" | "sms" | "in_app";
export type NotificationKind =
  | "window_reminder"
  | "wishlist_match"
  | "daily_summary";

// ── Row types ──────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  display_name: string | null;
  home_city: string | null;
  home_state: string | null;
  home_country: string;
  timezone: string;
  vehicle_type: string | null;
  /** Informational only. Never used to authenticate with any external platform. */
  primary_platform: Platform | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Station {
  id: string;
  code: string;
  name: string;
  city: string;
  state: string | null;
  country: string;
  lat: number | null;
  lon: number | null;
  platform: string;
  active: boolean;
  created_at: string;
}

export interface DriverStationPreference {
  id: string;
  user_id: string;
  station_id: string;
  priority: number;
  notes: string | null;
  created_at: string;
  // joined
  station?: Station;
}

export interface AvailabilityWindow {
  id: string;
  user_id: string;
  start_at: string;
  end_at: string;
  recurrence_rule: string | null;
  label: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DesiredBlock {
  id: string;
  user_id: string;
  station_id: string | null;
  day_of_week: number | null;
  start_time: string | null;
  end_time: string | null;
  min_pay_cents: number | null;
  min_duration_minutes: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // joined
  station?: Station | null;
}

export interface OpportunityLog {
  id: string;
  user_id: string;
  station_id: string | null;
  observed_at: string;
  start_at: string;
  end_at: string;
  offered_pay_cents: number;
  outcome: OpportunityOutcome;
  source: OpportunitySource;
  notes: string | null;
  created_at: string;
  // joined
  station?: Station | null;
}

export interface EarningsEntry {
  id: string;
  user_id: string;
  opportunity_log_id: string | null;
  station_id: string | null;
  worked_at: string;
  start_at: string;
  end_at: string;
  gross_cents: number;
  tips_cents: number;
  mileage: number | null;
  platform: string;
  notes: string | null;
  created_at: string;
  // joined
  station?: Station | null;
}

export interface NotificationPreference {
  user_id: string;
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  min_minutes_before_window: number;
  frequency_cap_per_hour: number;
  created_at: string;
  updated_at: string;
}

export interface NotificationEvent {
  id: string;
  user_id: string;
  channel: NotificationChannel;
  kind: NotificationKind;
  payload: Record<string, unknown>;
  sent_at: string;
  delivered: boolean | null;
  error: string | null;
}

export interface AuditLog {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip: string | null;
  created_at: string;
}

export interface PlatformConfig {
  key: string;
  value: unknown;
  updated_at: string;
  updated_by: string | null;
}

// ── Insert types (omit server-generated fields) ────────────────────────────────

export type InsertProfile = Omit<Profile, "created_at" | "updated_at" | "is_admin">;
export type InsertAvailabilityWindow = Omit<AvailabilityWindow, "id" | "created_at" | "updated_at">;
export type InsertDesiredBlock = Omit<DesiredBlock, "id" | "created_at" | "updated_at" | "station">;
export type InsertOpportunityLog = Omit<OpportunityLog, "id" | "created_at" | "station">;
export type InsertEarningsEntry = Omit<EarningsEntry, "id" | "created_at" | "station">;
export type InsertDriverStationPreference = Omit<DriverStationPreference, "id" | "created_at" | "station">;

// ── Database type wrapper (for @supabase/ssr generic) ─────────────────────────
//
// NOTE: Hand-written Database type. Postgrest-js 1.20+ uses a strict query
// parser that prefers the canonical `supabase gen types typescript` output —
// when the schema grows, run that against the live project and replace this
// block. The current generic shape is correct enough for runtime; tsc strict
// inference returns `never` for table rows but the runtime SQL is unaffected.

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: InsertProfile; Update: Partial<Profile> };
      stations: { Row: Station; Insert: Omit<Station, "id" | "created_at">; Update: Partial<Station> };
      driver_station_preferences: { Row: DriverStationPreference; Insert: InsertDriverStationPreference; Update: Partial<DriverStationPreference> };
      availability_windows: { Row: AvailabilityWindow; Insert: InsertAvailabilityWindow; Update: Partial<AvailabilityWindow> };
      desired_blocks: { Row: DesiredBlock; Insert: InsertDesiredBlock; Update: Partial<DesiredBlock> };
      opportunity_logs: { Row: OpportunityLog; Insert: InsertOpportunityLog; Update: Partial<OpportunityLog> };
      earnings_entries: { Row: EarningsEntry; Insert: InsertEarningsEntry; Update: Partial<EarningsEntry> };
      notification_preferences: { Row: NotificationPreference; Insert: NotificationPreference; Update: Partial<NotificationPreference> };
      notification_events: { Row: NotificationEvent; Insert: Omit<NotificationEvent, "id">; Update: Partial<NotificationEvent> };
      audit_logs: { Row: AuditLog; Insert: Omit<AuditLog, "id" | "created_at">; Update: never };
      platform_config: { Row: PlatformConfig; Insert: PlatformConfig; Update: Partial<PlatformConfig> };
    };
    Functions: {
      is_admin: { Args: Record<never, never>; Returns: boolean };
    };
  };
};
