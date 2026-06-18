"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const AddPreferenceSchema = z.object({
  station_id: z.string().uuid(),
  priority: z.number().int().min(1).max(5).default(3),
  notes: z.string().max(500).optional(),
});

export async function listStations(options?: {
  platform?: string;
  city?: string;
  search?: string;
}) {
  const supabase = await createClient();
  let query = supabase.from("stations").select("*").eq("active", true).order("city").order("name");

  if (options?.platform) query = query.eq("platform", options.platform);
  if (options?.city) query = query.ilike("city", `%${options.city}%`);
  if (options?.search)
    query = query.or(`name.ilike.%${options.search}%,code.ilike.%${options.search}%`);

  const { data, error } = await query;
  return { data: data ?? [], error: error?.message };
}

export async function listMyPreferences() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Unauthorized" };

  const { data, error } = await supabase
    .from("driver_station_preferences")
    .select("*, station:stations(*)")
    .eq("user_id", user.id)
    .order("priority");

  return { data: data ?? [], error: error?.message };
}

export async function addPreference(
  raw: z.infer<typeof AddPreferenceSchema>
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const parsed = AddPreferenceSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.message };

  const { error } = await supabase.from("driver_station_preferences").insert({
    user_id: user.id,
    ...parsed.data,
  });
  if (error) return { error: error.message };

  await logAudit({
    actor_user_id: user.id,
    action: "create",
    entity_type: "driver_station_preference",
    metadata: { station_id: parsed.data.station_id },
  });
  return {};
}

export async function removePreference(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("driver_station_preferences")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  await logAudit({
    actor_user_id: user.id,
    action: "delete",
    entity_type: "driver_station_preference",
    entity_id: id,
  });
  return {};
}
