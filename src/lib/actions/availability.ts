"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const WindowSchema = z.object({
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
  recurrence_rule: z.string().max(500).nullable().optional(),
  label: z.string().max(100).optional(),
  is_active: z.boolean().optional().default(true),
});

export async function listAvailabilityWindows(opts?: { from?: string; to?: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Unauthorized" };

  let query = supabase
    .from("availability_windows")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("start_at");

  if (opts?.from) query = query.gte("start_at", opts.from);
  if (opts?.to) query = query.lte("start_at", opts.to);

  const { data, error } = await query;
  return { data: data ?? [], error: error?.message };
}

export async function createAvailabilityWindow(
  raw: z.infer<typeof WindowSchema>
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const parsed = WindowSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.message };

  const { data, error } = await supabase
    .from("availability_windows")
    .insert({ user_id: user.id, ...parsed.data })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await logAudit({
    actor_user_id: user.id,
    action: "create",
    entity_type: "availability_window",
    entity_id: data.id,
    metadata: { start_at: parsed.data.start_at, end_at: parsed.data.end_at },
  });
  return { id: data.id };
}

export async function updateAvailabilityWindow(
  id: string,
  raw: Partial<z.infer<typeof WindowSchema>>
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("availability_windows")
    .update(raw)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  await logAudit({
    actor_user_id: user.id,
    action: "update",
    entity_type: "availability_window",
    entity_id: id,
  });
  return {};
}

export async function deleteAvailabilityWindow(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("availability_windows")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  await logAudit({
    actor_user_id: user.id,
    action: "delete",
    entity_type: "availability_window",
    entity_id: id,
  });
  return {};
}
