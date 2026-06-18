"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const PrefSchema = z.object({
  push_enabled: z.boolean().optional(),
  email_enabled: z.boolean().optional(),
  sms_enabled: z.boolean().optional(),
  quiet_hours_start: z.string().nullable().optional(),
  quiet_hours_end: z.string().nullable().optional(),
  min_minutes_before_window: z.number().int().min(0).max(1440).optional(),
  frequency_cap_per_hour: z.number().int().min(1).max(60).optional(),
});

export async function getNotificationPreferences() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return data;
}

export async function upsertNotificationPreferences(
  raw: z.infer<typeof PrefSchema>
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const parsed = PrefSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.message };

  const { error } = await supabase
    .from("notification_preferences")
    .upsert({ user_id: user.id, ...parsed.data });

  if (error) return { error: error.message };

  await logAudit({
    actor_user_id: user.id,
    action: "update",
    entity_type: "notification_preferences",
    entity_id: user.id,
  });
  return {};
}

export async function listNotificationEvents(limit = 20) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [] };

  const { data } = await supabase
    .from("notification_events")
    .select("*")
    .eq("user_id", user.id)
    .order("sent_at", { ascending: false })
    .limit(limit);

  return { data: data ?? [] };
}
