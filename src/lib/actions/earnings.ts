"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const EarningsSchema = z.object({
  opportunity_log_id: z.string().uuid().nullable().optional(),
  station_id: z.string().uuid().nullable().optional(),
  worked_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
  gross_cents: z.number().int().min(0),
  tips_cents: z.number().int().min(0).optional().default(0),
  mileage: z.number().min(0).nullable().optional(),
  platform: z.string().max(50),
  notes: z.string().max(1000).optional(),
});

export async function listEarnings(opts?: {
  limit?: number;
  from?: string;
  to?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Unauthorized" };

  let query = supabase
    .from("earnings_entries")
    .select("*, station:stations(*)")
    .eq("user_id", user.id)
    .order("worked_at", { ascending: false })
    .limit(opts?.limit ?? 50);

  if (opts?.from) query = query.gte("worked_at", opts.from);
  if (opts?.to) query = query.lte("worked_at", opts.to);

  const { data, error } = await query;
  return { data: data ?? [], error: error?.message };
}

export async function createEarningsEntry(
  raw: z.infer<typeof EarningsSchema>
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const parsed = EarningsSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.message };

  const { data, error } = await supabase
    .from("earnings_entries")
    .insert({ user_id: user.id, ...parsed.data })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await logAudit({
    actor_user_id: user.id,
    action: "create",
    entity_type: "earnings_entry",
    entity_id: data.id,
    metadata: { gross_cents: parsed.data.gross_cents, worked_at: parsed.data.worked_at },
  });
  return { id: data.id };
}

export async function updateEarningsEntry(
  id: string,
  raw: Partial<z.infer<typeof EarningsSchema>>
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("earnings_entries")
    .update(raw)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  await logAudit({
    actor_user_id: user.id,
    action: "update",
    entity_type: "earnings_entry",
    entity_id: id,
  });
  return {};
}

export async function deleteEarningsEntry(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("earnings_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  await logAudit({
    actor_user_id: user.id,
    action: "delete",
    entity_type: "earnings_entry",
    entity_id: id,
  });
  return {};
}

/** Last 8 weeks of earnings grouped by week start (for charts). */
export async function earningsByWeek(): Promise<
  { week: string; gross: number; tips: number; total: number }[]
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const { data } = await supabase
    .from("earnings_entries")
    .select("worked_at, gross_cents, tips_cents")
    .eq("user_id", user.id)
    .gte("worked_at", eightWeeksAgo.toISOString().split("T")[0])
    .order("worked_at");

  if (!data) return [];

  // Group by ISO week (Monday-start)
  const weekMap = new Map<string, { gross: number; tips: number }>();

  for (const row of data) {
    const d = new Date(row.worked_at);
    // Get Monday of the week
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const weekKey = monday.toISOString().split("T")[0];

    const existing = weekMap.get(weekKey) ?? { gross: 0, tips: 0 };
    weekMap.set(weekKey, {
      gross: existing.gross + (row.gross_cents ?? 0),
      tips: existing.tips + (row.tips_cents ?? 0),
    });
  }

  return Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, { gross, tips }]) => ({
      week,
      gross: gross / 100,
      tips: tips / 100,
      total: (gross + tips) / 100,
    }));
}
