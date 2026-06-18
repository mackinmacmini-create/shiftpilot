"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const OpportunitySchema = z.object({
  station_id: z.string().uuid().nullable().optional(),
  observed_at: z.string().datetime().optional(),
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
  offered_pay_cents: z.number().int().min(0),
  outcome: z.enum(["grabbed", "passed", "missed", "cancelled"]),
  source: z.enum(["app", "reminder", "manual"]).optional().default("manual"),
  notes: z.string().max(1000).optional(),
});

export async function listOpportunities(opts?: {
  limit?: number;
  offset?: number;
  outcome?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], count: 0, error: "Unauthorized" };

  let query = supabase
    .from("opportunity_logs")
    .select("*, station:stations(*)", { count: "exact" })
    .eq("user_id", user.id)
    .order("observed_at", { ascending: false })
    .limit(opts?.limit ?? 20);

  if (opts?.offset) query = query.range(opts.offset, (opts.offset) + (opts.limit ?? 20) - 1);
  if (opts?.outcome) query = query.eq("outcome", opts.outcome);

  const { data, count, error } = await query;
  return { data: data ?? [], count: count ?? 0, error: error?.message };
}

export async function createOpportunity(
  raw: z.infer<typeof OpportunitySchema>
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const parsed = OpportunitySchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.message };

  const { data, error } = await supabase
    .from("opportunity_logs")
    .insert({
      user_id: user.id,
      observed_at: parsed.data.observed_at ?? new Date().toISOString(),
      ...parsed.data,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await logAudit({
    actor_user_id: user.id,
    action: "create",
    entity_type: "opportunity_log",
    entity_id: data.id,
    metadata: { outcome: parsed.data.outcome, offered_pay_cents: parsed.data.offered_pay_cents },
  });
  return { id: data.id };
}

export async function updateOpportunity(
  id: string,
  raw: Partial<z.infer<typeof OpportunitySchema>>
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("opportunity_logs")
    .update(raw)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  await logAudit({
    actor_user_id: user.id,
    action: "update",
    entity_type: "opportunity_log",
    entity_id: id,
  });
  return {};
}

export async function deleteOpportunity(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("opportunity_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  await logAudit({
    actor_user_id: user.id,
    action: "delete",
    entity_type: "opportunity_log",
    entity_id: id,
  });
  return {};
}

/** Today's grabbed opportunities (for dashboard) */
export async function todayOpportunities() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [] };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { data } = await supabase
    .from("opportunity_logs")
    .select("*, station:stations(*)")
    .eq("user_id", user.id)
    .gte("observed_at", todayStart.toISOString())
    .lte("observed_at", todayEnd.toISOString())
    .order("observed_at");

  return { data: data ?? [] };
}
