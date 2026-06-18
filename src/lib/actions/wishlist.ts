"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const DesiredBlockSchema = z.object({
  station_id: z.string().uuid().nullable().optional(),
  day_of_week: z.number().int().min(0).max(6).nullable().optional(),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  min_pay_cents: z.number().int().min(0).nullable().optional(),
  min_duration_minutes: z.number().int().min(1).nullable().optional(),
  notes: z.string().max(500).optional(),
  is_active: z.boolean().optional().default(true),
});

export async function listDesiredBlocks() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Unauthorized" };

  const { data, error } = await supabase
    .from("desired_blocks")
    .select("*, station:stations(*)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("day_of_week", { nullsFirst: false })
    .order("start_time", { nullsFirst: false });

  return { data: data ?? [], error: error?.message };
}

export async function createDesiredBlock(
  raw: z.infer<typeof DesiredBlockSchema>
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const parsed = DesiredBlockSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.message };

  const { data, error } = await supabase
    .from("desired_blocks")
    .insert({ user_id: user.id, ...parsed.data })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await logAudit({
    actor_user_id: user.id,
    action: "create",
    entity_type: "desired_block",
    entity_id: data.id,
  });
  return { id: data.id };
}

export async function updateDesiredBlock(
  id: string,
  raw: Partial<z.infer<typeof DesiredBlockSchema>>
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("desired_blocks")
    .update(raw)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  await logAudit({
    actor_user_id: user.id,
    action: "update",
    entity_type: "desired_block",
    entity_id: id,
  });
  return {};
}

export async function deleteDesiredBlock(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("desired_blocks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  await logAudit({
    actor_user_id: user.id,
    action: "delete",
    entity_type: "desired_block",
    entity_id: id,
  });
  return {};
}
