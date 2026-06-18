"use server";

import { createServiceClient } from "@/lib/supabase/server";

interface AuditParams {
  actor_user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}

/**
 * Append-only audit log writer.
 * Uses the service-role client so it bypasses RLS (users cannot write audit_logs).
 * Call this after every non-read server action.
 */
export async function logAudit(params: AuditParams): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from("audit_logs").insert({
      actor_user_id: params.actor_user_id ?? null,
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id ?? null,
      metadata: params.metadata ?? {},
      ip: params.ip ?? null,
    });
  } catch (err) {
    // Audit failures must never break the primary operation.
    // Log to server console only — never surface to client.
    console.error("[audit] write failed:", err);
  }
}
