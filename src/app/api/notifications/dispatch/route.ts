import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * /api/notifications/dispatch — cron-triggered reminder dispatcher.
 *
 * SAFETY CONTRACT (see SAFETY.md):
 *   - This function MUST NOT make HTTP requests to Amazon Flex, Uber, DoorDash,
 *     Instacart, or any other gig platform. Ever.
 *   - It only reads ShiftPilot's own database and writes notification_events rows.
 *   - All notification delivery (FCM, OneSignal, Apple Push, email) is a TODO
 *     that must be implemented in a follow-up PR with explicit review.
 *
 * Auth:
 *   - Caller must present `Authorization: Bearer <CRON_SECRET>`.
 *   - Vercel cron sets the `Authorization` header automatically when CRON_SECRET
 *     is configured as a project env var.
 *   - When CRON_SECRET is unset, the route refuses every request (fail-closed).
 *
 * Schedule (vercel.json): GET every minute.
 * Manual invocation: POST with the same bearer header.
 */

function constantTimeEqual(a: string, b: string): boolean {
  const aBytes = Buffer.from(a);
  const bBytes = Buffer.from(b);
  if (aBytes.length !== bBytes.length) return false;
  return timingSafeEqual(aBytes, bBytes);
}

function authorize(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured — dispatcher disabled" },
      { status: 503 }
    );
  }
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!constantTimeEqual(header.slice(7), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

/**
 * True when `current` (HH:MM) falls inside [start, end].
 * Handles overnight wrap-around: e.g. quiet hours 22:00 → 06:00 covers 23:30.
 * Exported via shared helper for unit tests.
 */
export function inQuietHours(
  current: string,
  start: string | null | undefined,
  end: string | null | undefined
): boolean {
  if (!start || !end) return false;
  if (start === end) return false;
  if (start < end) {
    // Same-day window (e.g. 12:00 → 14:00)
    return current >= start && current <= end;
  }
  // Wrap-around window (e.g. 22:00 → 06:00)
  return current >= start || current <= end;
}

type PushOutcome =
  | { ok: true; provider: "onesignal"; recipients: number }
  | { ok: false; error: string };

/**
 * Send a OneSignal push to the given Supabase user_id (used as external_user_id).
 * Returns delivery outcome — caller writes to notification_events.
 *
 * SAFETY: the only URL touched here is api.onesignal.com. No call to any gig
 * platform under any code path.
 */
async function sendPush(
  userId: string,
  title: string,
  body: string,
  url: string
): Promise<PushOutcome> {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    return { ok: false, error: "OneSignal not configured" };
  }
  try {
    const resp = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_aliases: { external_id: [userId] },
        target_channel: "push",
        headings: { en: title },
        contents: { en: body },
        url,
      }),
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      return { ok: false, error: `OneSignal ${resp.status}: ${txt.slice(0, 200)}` };
    }
    const json = (await resp.json()) as { recipients?: number };
    return { ok: true, provider: "onesignal", recipients: json.recipients ?? 0 };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

async function dispatch() {
  const service = createServiceClient();
  const now = new Date();

  const { data: prefs } = await service
    .from("notification_preferences")
    .select(
      "user_id, min_minutes_before_window, push_enabled, email_enabled, quiet_hours_start, quiet_hours_end, frequency_cap_per_hour"
    );

  if (!prefs || prefs.length === 0) {
    return { dispatched: 0, message: "No preferences found" };
  }

  let dispatched = 0;
  const errors: string[] = [];

  for (const pref of prefs) {
    try {
      if (!pref.push_enabled && !pref.email_enabled) continue;

      const currentTime = now.toTimeString().slice(0, 5);
      if (inQuietHours(currentTime, pref.quiet_hours_start, pref.quiet_hours_end)) {
        continue;
      }

      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const { count: recentCount } = await service
        .from("notification_events")
        .select("*", { count: "exact", head: true })
        .eq("user_id", pref.user_id)
        .gte("sent_at", oneHourAgo);

      if ((recentCount ?? 0) >= pref.frequency_cap_per_hour) continue;

      const windowStart = new Date(
        now.getTime() + pref.min_minutes_before_window * 60 * 1000
      );
      const windowEnd = new Date(windowStart.getTime() + 60 * 1000);

      const { data: windows } = await service
        .from("availability_windows")
        .select("id, start_at, end_at, label")
        .eq("user_id", pref.user_id)
        .eq("is_active", true)
        .gte("start_at", windowStart.toISOString())
        .lt("start_at", windowEnd.toISOString());

      if (!windows || windows.length === 0) continue;

      for (const window of windows) {
        const channel = pref.push_enabled ? "push" : "email";
        const title = window.label ?? "ShiftPilot reminder";
        const body = `Your availability window starts at ${new Date(
          window.start_at
        ).toLocaleTimeString()}. Open your gig app to check for offers.`;
        const payload = {
          window_id: window.id,
          window_start: window.start_at,
          window_end: window.end_at,
          label: title,
          message: body,
          // ShiftPilot only reminds the user to check their own app.
          // It never opens, interacts with, or acts on any gig platform.
        };

        let delivered: boolean | null = null;
        let errorText: string | null = null;

        if (channel === "push") {
          const outcome = await sendPush(
            pref.user_id,
            title,
            body,
            "/dashboard"
          );
          if (outcome.ok) {
            delivered = outcome.recipients > 0;
            if (outcome.recipients === 0) {
              errorText = "OneSignal accepted but no subscribed recipient";
            }
          } else {
            delivered = false;
            errorText = outcome.error;
          }
        } else {
          // Email delivery is not yet wired. Log the intent so we can ship it later.
          delivered = false;
          errorText = "Email channel not yet wired";
        }

        await service.from("notification_events").insert({
          user_id: pref.user_id,
          channel,
          kind: "window_reminder",
          payload,
          sent_at: now.toISOString(),
          delivered,
          error: errorText,
        });

        dispatched++;
      }
    } catch (err) {
      errors.push(`user ${pref.user_id}: ${String(err)}`);
    }
  }

  return {
    dispatched,
    errors: errors.length > 0 ? errors : undefined,
    provider: ONESIGNAL_APP_ID ? "onesignal" : "none",
    ts: now.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const unauthorized = authorize(req);
  if (unauthorized) return unauthorized;
  return NextResponse.json(await dispatch());
}

export async function POST(req: NextRequest) {
  const unauthorized = authorize(req);
  if (unauthorized) return unauthorized;
  return NextResponse.json(await dispatch());
}
