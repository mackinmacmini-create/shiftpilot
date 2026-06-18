"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getProfile, upsertProfile } from "@/lib/actions/profile";
import { PLATFORM_LABELS } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";

const schema = z.object({
  display_name: z.string().max(100).optional(),
  home_city: z.string().max(100).optional(),
  home_state: z.string().max(50).optional(),
  home_country: z.string().max(2).optional(),
  timezone: z.string().max(60).optional(),
  vehicle_type: z.string().max(100).optional(),
  primary_platform: z
    .enum(["amazon_flex", "uber_eats", "doordash", "instacart", "other", ""])
    .optional(),
});

type FormValues = z.infer<typeof schema>;

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
];

export default function ProfilePage() {
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    getProfile().then((p) => {
      if (p) {
        reset({
          display_name: p.display_name ?? "",
          home_city: p.home_city ?? "",
          home_state: p.home_state ?? "",
          home_country: p.home_country ?? "US",
          timezone: p.timezone ?? "America/New_York",
          vehicle_type: p.vehicle_type ?? "",
          primary_platform: (p.primary_platform as FormValues["primary_platform"]) ?? "",
        });
      }
    });
  }, [reset]);

  async function onSubmit(values: FormValues) {
    await upsertProfile({
      ...values,
      primary_platform: values.primary_platform || undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="mx-auto max-w-xl px-4 pt-6 space-y-4">
      <h1 className="text-xl font-bold text-white">Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>Your details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="display_name">Display name</Label>
              <Input id="display_name" placeholder="Alex" {...register("display_name")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="home_city">City</Label>
                <Input id="home_city" placeholder="Miami" {...register("home_city")} />
              </div>
              <div>
                <Label htmlFor="home_state">State</Label>
                <Input id="home_state" placeholder="FL" {...register("home_state")} />
              </div>
            </div>
            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Select id="timezone" {...register("timezone")}>
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace("America/", "").replace("Pacific/", "Pacific/")}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="vehicle_type">Vehicle type</Label>
              <Input id="vehicle_type" placeholder="e.g. Sedan, SUV" {...register("vehicle_type")} />
            </div>
            <div>
              <Label htmlFor="primary_platform">Primary gig platform (informational only)</Label>
              <Select id="primary_platform" {...register("primary_platform")}>
                <option value="">Not set</option>
                {Object.entries(PLATFORM_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </Select>
              <div className="mt-2 flex items-start gap-2 rounded-lg bg-white/5 px-3 py-2">
                <Shield className="h-3.5 w-3.5 shrink-0 text-teal-500 mt-0.5" />
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  This is for display purposes only. ShiftPilot never uses this to connect to, log into, or act on any platform.
                </p>
              </div>
            </div>

            <Button type="submit" loading={isSubmitting} className="w-full">
              {saved ? "Saved!" : "Save profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="danger" onClick={handleLogout} className="w-full">
            Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
