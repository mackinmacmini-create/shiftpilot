import { createClient } from "@/lib/supabase/server";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCents, payRatePerHour, durationMinutes, formatMinutes, DOW_LABELS } from "@/lib/utils";
import { StationChart, DowChart } from "./charts";

type EarningRow = {
  gross_cents: number;
  tips_cents: number;
  start_at: string;
  end_at: string;
  worked_at: string;
  station: { code?: string; name?: string; platform?: string } | null;
};

type OppRow = {
  outcome: string | null;
};

async function getAnalyticsData(userId: string) {
  const supabase = await createClient();

  const [{ data: earnings }, { data: opps }] = await Promise.all([
    supabase
      .from("earnings_entries")
      .select("*, station:stations(code, name, platform)")
      .eq("user_id", userId)
      .order("worked_at", { ascending: false })
      .limit(500),
    supabase
      .from("opportunity_logs")
      .select("*")
      .eq("user_id", userId)
      .limit(500),
  ]);

  return {
    earnings: (earnings ?? []) as unknown as EarningRow[],
    opps: (opps ?? []) as unknown as OppRow[],
  };
}

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { earnings, opps } = await getAnalyticsData(user!.id);

  // By-station aggregation
  const stationMap = new Map<string, { name: string; gross: number; tips: number; minutes: number; count: number }>();
  for (const e of earnings) {
    const key = e.station?.code ?? "No station";
    const name = e.station?.name ?? "No station";
    const prev = stationMap.get(key) ?? { name, gross: 0, tips: 0, minutes: 0, count: 0 };
    stationMap.set(key, {
      name,
      gross: prev.gross + e.gross_cents,
      tips: prev.tips + e.tips_cents,
      minutes: prev.minutes + durationMinutes(e.start_at, e.end_at),
      count: prev.count + 1,
    });
  }

  const stationData = Array.from(stationMap.entries())
    .map(([code, d]) => ({
      code,
      name: d.name,
      total: (d.gross + d.tips) / 100,
      rate: payRatePerHour(d.gross + d.tips, d.minutes),
      count: d.count,
      hours: d.minutes / 60,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // By-day-of-week aggregation
  const dowMap: Record<number, { gross: number; minutes: number; count: number }> = {};
  for (let i = 0; i < 7; i++) dowMap[i] = { gross: 0, minutes: 0, count: 0 };

  for (const e of earnings) {
    const dow = new Date(e.worked_at).getDay();
    dowMap[dow].gross += e.gross_cents + e.tips_cents;
    dowMap[dow].minutes += durationMinutes(e.start_at, e.end_at);
    dowMap[dow].count += 1;
  }

  const dowData = DOW_LABELS.map((label, i) => ({
    day: label,
    total: dowMap[i].gross / 100,
    rate: payRatePerHour(dowMap[i].gross, dowMap[i].minutes),
    count: dowMap[i].count,
  }));

  // Opportunity stats
  const total = opps.length;
  const grabbed = opps.filter((o) => o.outcome === "grabbed").length;
  const passed = opps.filter((o) => o.outcome === "passed").length;

  return (
    <div className="mx-auto max-w-xl px-4 pt-6 space-y-5">
      <h1 className="text-xl font-bold text-white">Analytics</h1>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <p className="text-xs text-slate-500 mb-1">Opportunities</p>
          <p className="text-xl font-bold text-white">{total}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500 mb-1">Grabbed</p>
          <p className="text-xl font-bold text-teal-400">{grabbed}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500 mb-1">Pass rate</p>
          <p className="text-xl font-bold text-white">
            {total > 0 ? Math.round((passed / total) * 100) : 0}%
          </p>
        </Card>
      </div>

      <Tabs defaultValue="station">
        <TabsList className="w-full">
          <TabsTrigger value="station">By station</TabsTrigger>
          <TabsTrigger value="dow">By day</TabsTrigger>
        </TabsList>

        {/* By station */}
        <TabsContent value="station">
          {stationData.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-[#13171c] py-10 text-center">
              <p className="text-sm text-slate-500">Add earnings entries to see station analytics.</p>
            </div>
          ) : (
            <>
              <Card className="mb-3">
                <CardHeader>
                  <CardTitle>Total earnings by station</CardTitle>
                </CardHeader>
                <CardContent>
                  <StationChart data={stationData} />
                </CardContent>
              </Card>

              <div className="space-y-2">
                {stationData.map((s) => (
                  <Card key={s.code}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">{s.name}</p>
                        <p className="text-xs text-slate-500">
                          {s.count} shifts · {formatMinutes(Math.round(s.hours * 60))}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">{formatCents(Math.round(s.total * 100))}</p>
                        <p className="text-xs text-teal-400">${s.rate.toFixed(2)}/hr</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* By day of week */}
        <TabsContent value="dow">
          <Card className="mb-3">
            <CardHeader>
              <CardTitle>Earnings by day of week</CardTitle>
            </CardHeader>
            <CardContent>
              <DowChart data={dowData} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-4 gap-2">
            {dowData.map((d) => (
              <Card key={d.day} className="p-3">
                <p className="text-xs font-semibold text-white">{d.day}</p>
                <p className="text-sm font-bold text-teal-400 mt-1">${d.total.toFixed(0)}</p>
                <p className="text-[10px] text-slate-500">{d.count} shifts</p>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
