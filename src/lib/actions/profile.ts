"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import type { Profile } from "@/lib/types/db";

const UpdateProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  home_city: z.string().max(100).optional(),
  home_state: z.string().max(50).optional(),
  home_country: z.string().max(2).optional(),
  timezone: z.string().max(60).optional(),
  vehicle_type: z.string().max(100).optional(),
  primary_platform: z
    .enum(["amazon_flex", "uber_eats", "doordash", "instacart", "other"])
    .nullable()
    .optional(),
});

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data;
}

export async function upsertProfile(
  raw: z.infer<typeof UpdateProfileSchema>
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const parsed = UpdateProfileSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.message };

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, ...parsed.data });

  if (error) return { error: error.message };

  await logAudit({
    actor_user_id: user.id,
    action: "update",
    entity_type: "profile",
    entity_id: user.id,
    metadata: { fields: Object.keys(parsed.data) },
  });

  return {};
}

/** Called from auth callback to ensure a profile row exists on first login. */
export async function ensureProfile(userId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("profiles").upsert({ id: userId }, { onConflict: "id" });

  // Bootstrap admin from env var
  const bootstrapEmail = process.env.SHIFTPILOT_ADMIN_BOOTSTRAP_EMAIL;
  if (bootstrapEmail) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email === bootstrapEmail) {
      const serviceClient = (await import("@/lib/supabase/server")).createServiceClient();
      await serviceClient
        .from("profiles")
        .update({ is_admin: true })
        .eq("id", userId);
      await logAudit({
        actor_user_id: null,
        action: "bootstrap_admin",
        entity_type: "profile",
        entity_id: userId,
        metadata: { note: "Promoted via SHIFTPILOT_ADMIN_BOOTSTRAP_EMAIL" },
      });
    }
  }
}
