"use client";

import { useEffect } from "react";
import Script from "next/script";
import { createClient } from "@/lib/supabase/client";

const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

declare global {
  interface Window {
    OneSignal?: {
      init: (opts: Record<string, unknown>) => Promise<void>;
      login: (externalId: string) => Promise<void>;
      logout: () => Promise<void>;
      Notifications: {
        permission: boolean;
        requestPermission: () => Promise<boolean>;
      };
    };
    OneSignalDeferred?: Array<(os: NonNullable<Window["OneSignal"]>) => void>;
  }
}

/**
 * Initializes OneSignal Web SDK and tags the current Supabase user as the
 * external_user_id. The dispatcher targets users by external_user_id, so we
 * never need to store OneSignal player_ids in our own database.
 *
 * Safety: this only enables ShiftPilot's own reminder pushes. It does NOT
 * subscribe to, listen for, or interact with any gig-platform notification.
 */
export function OneSignalInit() {
  useEffect(() => {
    if (!APP_ID) return;
    if (typeof window === "undefined") return;

    window.OneSignalDeferred = window.OneSignalDeferred ?? [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      await OneSignal.init({
        appId: APP_ID,
        notifyButton: { enable: false },
        allowLocalhostAsSecureOrigin: process.env.NODE_ENV !== "production",
      });

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        try {
          await OneSignal.login(user.id);
        } catch (err) {
          console.warn("[ShiftPilot] OneSignal login failed", err);
        }
      }
    });
  }, []);

  if (!APP_ID) return null;

  return (
    <Script
      src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
      strategy="afterInteractive"
    />
  );
}
