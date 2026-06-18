import { createClient } from "@/lib/supabase/server";
import { earningsByWeek } from "@/lib/actions/earnings";
import { todayOpportunities } from "@/lib/actions/opportunities";
import { listAvailabilityWindows } from "@/lib/actions/availability";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EarningsChart } from "@/components/EarningsChart";
import { formatCents, OUTCOME_COLORS } from "@/lib/utils";
import { Bell, Calendar, TrendingUp, ClipboardList } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user!.id)
    .single();

  const [weeklyEarnings, { data: todayOps }, { data: upcomingWindows }] = await Promise.all([
    earningsByWeek(),
    todayOpportunities(),
    listAvailabilityWindows({
      from: new Date().toISOString(),
      to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  ]);

  const thisWeek = weeklyEarnings[weeklyEarnings.length - 1];
  const todayGrabbed = todayOps.filter((o) => o.outcome === "grabbed");

  const greeting = profile?.display_name ? `Hey, ${profile.display_name}` : "Welcome back";
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="mx-auto max-w-xl px-4 pt-6 space-y-4">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-white">{timeGreeting}</h1>
        <p className="text-sm text-slate-400">{greeting}</p>
      </div>

      {/* This week summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-teal-400" />
            <span className="text-xs text-slate-500 uppercase tracking-wider">This week</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {thisWeek ? `$${thisWeek.total.toFixed(2)}` : "$0.00"}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">total earned</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="h-4 w-4 text-teal-400" />
            <span className="text-xs text-slate-500 uppercase tracking-wider">Today</span>
          </div>
          <p className="text-2xl font-bold text-white">{todayGrabbed.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">blocks grabbed</p>
        </Card>
      </div>

      {/* Earnings sparkline */}
      <Card>
        <CardHeader>
          <CardTitle>Earnings — last 8 weeks</CardTitle>
        </CardHeader>
        <CardContent>
          <EarningsChart data={weeklyEarnings} />
        </CardContent>
      </Card>

      {/* Today's opportunities */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Today&apos;s activity</CardTitle>
            <Link href="/log" className="text-xs text-teal-400 hover:underline">
              + Log
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {todayOps.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm text-slate-500">No opportunities logged today.</p>
              <Link href="/log" className="mt-1 block text-sm text-teal-400 hover:underline">
                Log your first one
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {todayOps.map((op) => {
                const start = new Date(op.start_at);
                const end = new Date(op.end_at);
                return (
                  <div
                    key={op.id}
                    className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm text-white">
                        {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })} -{" "}
                        {end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                      </p>
                      <p className="text-xs text-slate-500">
                        {op.station?.name ?? "No station"} — {formatCents(op.offered_pay_cents)}
                      </p>
                    </div>
                    <Badge className={OUTCOME_COLORS[op.outcome]}>{op.outcome}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming windows */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-teal-400" />
              <CardTitle>Upcoming windows</CardTitle>
            </div>
            <Link href="/availability" className="text-xs text-teal-400 hover:underline">
              View all
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {upcomingWindows.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm text-slate-500">No availability windows set.</p>
              <Link href="/availability" className="mt-1 block text-sm text-teal-400 hover:underline">
                Set your schedule
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingWindows.slice(0, 3).map((w) => {
                const start = new Date(w.start_at);
                return (
                  <div
                    key={w.id}
                    className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5"
                  >
                    <Bell className="h-4 w-4 text-teal-400 shrink-0" />
                    <div>
                      <p className="text-sm text-white">
                        {start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        {" "}·{" "}
                        {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                      </p>
                      {w.label && <p className="text-xs text-slate-500">{w.label}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick log CTA */}
      <Link
        href="/log"
        className="block w-full rounded-2xl border border-teal-400/20 bg-teal-400/5 px-5 py-4 text-center text-sm font-medium text-teal-400 hover:bg-teal-400/10 transition-colors"
      >
        + Log an opportunity
      </Link>
    </div>
  );
}
