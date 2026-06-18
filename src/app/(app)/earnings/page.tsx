"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  listEarnings,
  createEarningsEntry,
  deleteEarningsEntry,
  earningsByWeek,
} from "@/lib/actions/earnings";
import { listStations } from "@/lib/actions/stations";
import { EarningsChart } from "@/components/EarningsChart";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { EarningsEntry, Station } from "@/lib/types/db";
import { formatCents, durationMinutes, formatMinutes, PLATFORM_LABELS } from "@/lib/utils";
import { Plus, Trash2, TrendingUp } from "lucide-react";

const schema = z.object({
  worked_at: z.string().min(1, "Required"),
  start_at: z.string().min(1, "Required"),
  end_at: z.string().min(1, "Required"),
  gross_display: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a dollar amount"),
  tips_display: z.string().optional(),
  mileage: z.string().optional(),
  platform: z.string().min(1, "Required"),
  station_id: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function EarningsPage() {
  const [entries, setEntries] = useState<EarningsEntry[]>([]);
  const [weeklyData, setWeeklyData] = useState<Awaited<ReturnType<typeof earningsByWeek>>>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function load() {
    const [{ data: e }, wd, { data: s }] = await Promise.all([
      listEarnings(),
      earningsByWeek(),
      listStations(),
    ]);
    setEntries(e as EarningsEntry[]);
    setWeeklyData(wd);
    setStations(s as Station[]);
  }

  useEffect(() => { load(); }, []);

  async function onSubmit(values: FormValues) {
    await createEarningsEntry({
      worked_at: values.worked_at,
      start_at: values.start_at,
      end_at: values.end_at,
      gross_cents: Math.round(parseFloat(values.gross_display) * 100),
      tips_cents: values.tips_display ? Math.round(parseFloat(values.tips_display) * 100) : 0,
      mileage: values.mileage ? parseFloat(values.mileage) : null,
      platform: values.platform,
      station_id: values.station_id || null,
      notes: values.notes,
    });
    reset();
    setShowForm(false);
    await load();
  }

  async function handleDelete(id: string) {
    await deleteEarningsEntry(id);
    await load();
  }

  const totalGross = entries.reduce((s, e) => s + e.gross_cents, 0);
  const totalTips = entries.reduce((s, e) => s + e.tips_cents, 0);

  return (
    <div className="mx-auto max-w-xl px-4 pt-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Earnings</h1>
        <Button size="sm" variant={showForm ? "secondary" : "primary"} onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" />
          {showForm ? "Cancel" : "Add entry"}
        </Button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <p className="text-xs text-slate-500 mb-1">Gross</p>
          <p className="text-lg font-bold text-white">{formatCents(totalGross)}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500 mb-1">Tips</p>
          <p className="text-lg font-bold text-teal-400">{formatCents(totalTips)}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500 mb-1">Total</p>
          <p className="text-lg font-bold text-white">{formatCents(totalGross + totalTips)}</p>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-teal-400" />
            <CardTitle>Weekly earnings</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <EarningsChart data={weeklyData} />
        </CardContent>
      </Card>

      {/* Add form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add earnings entry</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="worked_at">Date worked</Label>
                <Input id="worked_at" type="date" {...register("worked_at")} />
                {errors.worked_at && <p className="mt-1 text-xs text-red-400">{errors.worked_at.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start time</Label>
                  <Input type="datetime-local" {...register("start_at")} />
                </div>
                <div>
                  <Label>End time</Label>
                  <Input type="datetime-local" {...register("end_at")} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Gross pay ($)</Label>
                  <Input type="number" step="0.01" min="0" placeholder="45.00" {...register("gross_display")} />
                  {errors.gross_display && <p className="mt-1 text-xs text-red-400">{errors.gross_display.message}</p>}
                </div>
                <div>
                  <Label>Tips ($)</Label>
                  <Input type="number" step="0.01" min="0" placeholder="0.00" {...register("tips_display")} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Platform</Label>
                  <Select {...register("platform")}>
                    <option value="">Select platform</option>
                    {Object.entries(PLATFORM_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Mileage</Label>
                  <Input type="number" step="0.1" min="0" placeholder="12.5" {...register("mileage")} />
                </div>
              </div>
              <div>
                <Label>Station (optional)</Label>
                <Select {...register("station_id")}>
                  <option value="">No station</option>
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea placeholder="Optional notes..." {...register("notes")} />
              </div>
              <Button type="submit" loading={isSubmitting} className="w-full">Save entry</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Entry list */}
      {entries.length === 0 && !showForm ? (
        <div className="rounded-2xl border border-white/5 bg-[#13171c] py-12 text-center">
          <p className="text-sm text-slate-500 mb-2">No earnings entries yet.</p>
          <button onClick={() => setShowForm(true)} className="text-sm text-teal-400 hover:underline">
            Add your first entry
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const duration = durationMinutes(entry.start_at, entry.end_at);
            const total = entry.gross_cents + entry.tips_cents;
            return (
              <Card key={entry.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{formatCents(total)}</span>
                      {entry.tips_cents > 0 && (
                        <span className="text-xs text-teal-400">+{formatCents(entry.tips_cents)} tips</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(entry.worked_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      {" · "}
                      {formatMinutes(duration)}
                      {entry.mileage ? ` · ${entry.mileage} mi` : ""}
                    </p>
                    <p className="text-xs text-slate-500">
                      {PLATFORM_LABELS[entry.platform] ?? entry.platform}
                      {entry.station?.name ? ` · ${entry.station.name}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="rounded-lg p-1.5 text-slate-600 hover:bg-red-400/10 hover:text-red-400 transition-colors shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
