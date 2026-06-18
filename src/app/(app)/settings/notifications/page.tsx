"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  getNotificationPreferences,
  upsertNotificationPreferences,
} from "@/lib/actions/notifications";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, MessageSquare, Mail, Smartphone } from "lucide-react";

const schema = z.object({
  push_enabled: z.boolean(),
  email_enabled: z.boolean(),
  quiet_hours_start: z.string().optional(),
  quiet_hours_end: z.string().optional(),
  min_minutes_before_window: z.coerce.number().int().min(0).max(1440),
  frequency_cap_per_hour: z.coerce.number().int().min(1).max(60),
});

type FormValues = z.infer<typeof schema>;

export default function NotificationsSettingsPage() {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      push_enabled: true,
      email_enabled: false,
      min_minutes_before_window: 15,
      frequency_cap_per_hour: 4,
    },
  });

  useEffect(() => {
    getNotificationPreferences().then((p) => {
      if (p) {
        reset({
          push_enabled: p.push_enabled,
          email_enabled: p.email_enabled,
          quiet_hours_start: p.quiet_hours_start ?? "",
          quiet_hours_end: p.quiet_hours_end ?? "",
          min_minutes_before_window: p.min_minutes_before_window,
          frequency_cap_per_hour: p.frequency_cap_per_hour,
        });
      }
    });
  }, [reset]);

  async function onSubmit(values: FormValues) {
    await upsertNotificationPreferences({
      ...values,
      quiet_hours_start: values.quiet_hours_start || null,
      quiet_hours_end: values.quiet_hours_end || null,
    });
  }

  const pushEnabled = watch("push_enabled");
  const emailEnabled = watch("email_enabled");

  return (
    <div className="mx-auto max-w-xl px-4 pt-6 space-y-5">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-teal-400" />
        <h1 className="text-xl font-bold text-white">Notification settings</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Channels */}
        <Card>
          <CardHeader>
            <CardTitle>Channels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-sm text-white">Push notifications</p>
                  <p className="text-xs text-slate-500">Browser / device push (requires permission)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setValue("push_enabled", !pushEnabled, { shouldDirty: true })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  pushEnabled ? "bg-teal-400" : "bg-white/10"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    pushEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-sm text-white">Email notifications</p>
                  <p className="text-xs text-slate-500">Reminders to your account email</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setValue("email_enabled", !emailEnabled, { shouldDirty: true })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  emailEnabled ? "bg-teal-400" : "bg-white/10"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    emailEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-sm text-white">SMS</p>
                  <p className="text-xs text-slate-500">Coming soon</p>
                </div>
              </div>
              <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-white/5">
                <span className="inline-block h-4 w-4 translate-x-1 rounded-full bg-white/30" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timing */}
        <Card>
          <CardHeader>
            <CardTitle>Timing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="min_minutes_before_window">
                Remind me this many minutes before a window starts
              </Label>
              <Input
                id="min_minutes_before_window"
                type="number"
                min="0"
                max="1440"
                step="5"
                {...register("min_minutes_before_window")}
              />
            </div>

            <div>
              <Label htmlFor="frequency_cap_per_hour">Max reminders per hour</Label>
              <Input
                id="frequency_cap_per_hour"
                type="number"
                min="1"
                max="60"
                {...register("frequency_cap_per_hour")}
              />
            </div>

            <div>
              <Label>Quiet hours (no notifications)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Start</p>
                  <Input type="time" {...register("quiet_hours_start")} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">End</p>
                  <Input type="time" {...register("quiet_hours_end")} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" loading={isSubmitting} disabled={!isDirty} className="w-full">
          Save settings
        </Button>
      </form>
    </div>
  );
}
