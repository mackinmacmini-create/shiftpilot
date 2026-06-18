"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) throw new Error("Forbidden");
  return { supabase, user };
}

export async function adminGetStats() {
  try {
    await requireAdmin();
    const service = createServiceClient();

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: totalUsers },
      { count: recentOps },
      { count: recentNotifs },
      { data: recentAudit },
    ] = await Promise.all([
      service.from("profiles").select("*", { count: "exact", head: true }),
      service
        .from("opportunity_logs")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo),
      service
        .from("notification_events")
        .select("*", { count: "exact", head: true })
        .gte("sent_at", sevenDaysAgo),
      service
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    return {
      totalUsers: totalUsers ?? 0,
      recentOps: recentOps ?? 0,
      recentNotifs: recentNotifs ?? 0,
      recentAudit: recentAudit ?? [],
    };
  } catch {
    return null;
  }
}

export async function adminListUsers(opts?: { search?: string; limit?: number }) {
  try {
    await requireAdmin();
    const service = createServiceClient();

    let query = service
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(opts?.limit ?? 50);

    if (opts?.search) {
      query = query.ilike("display_name", `%${opts.search}%`);
    }

    const { data, error } = await query;
    return { data: data ?? [], error: error?.message };
  } catch (e) {
    return { data: [], error: String(e) };
  }
}

export async function adminSetAdmin(
  targetUserId: string,
  isAdmin: boolean
): Promise<{ error?: string }> {
  try {
    const { user } = await requireAdmin();
    const service = createServiceClient();

    const { error } = await service
      .from("profiles")
      .update({ is_admin: isAdmin })
      .eq("id", targetUserId);

    if (error) return { error: error.message };

    await logAudit({
      actor_user_id: user.id,
      action: isAdmin ? "grant_admin" : "revoke_admin",
      entity_type: "profile",
      entity_id: targetUserId,
    });
    return {};
  } catch (e) {
    return { error: String(e) };
  }
}

export async function adminListAuditLogs(opts?: {
  limit?: number;
  offset?: number;
  entity_type?: string;
  actor_user_id?: string;
}) {
  try {
    await requireAdmin();
    const service = createServiceClient();

    let query = service
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(opts?.limit ?? 50);

    if (opts?.offset) query = query.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1);
    if (opts?.entity_type) query = query.eq("entity_type", opts.entity_type);
    if (opts?.actor_user_id) query = query.eq("actor_user_id", opts.actor_user_id);

    const { data, count, error } = await query;
    return { data: data ?? [], count: count ?? 0, error: error?.message };
  } catch (e) {
    return { data: [], count: 0, error: String(e) };
  }
}

export async function adminGetConfig() {
  try {
    await requireAdmin();
    const service = createServiceClient();
    const { data } = await service.from("platform_config").select("*").order("key");
    return { data: data ?? [] };
  } catch {
    return { data: [] };
  }
}

export async function adminSetConfig(
  key: string,
  value: unknown
): Promise<{ error?: string }> {
  try {
    const { user } = await requireAdmin();
    const service = createServiceClient();

    const { error } = await service
      .from("platform_config")
      .upsert({ key, value: value as never, updated_at: new Date().toISOString(), updated_by: user.id });

    if (error) return { error: error.message };

    await logAudit({
      actor_user_id: user.id,
      action: "update",
      entity_type: "platform_config",
      metadata: { key },
    });
    return {};
  } catch (e) {
    return { error: String(e) };
  }
}
