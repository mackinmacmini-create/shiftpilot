"use client";

import { useEffect, useState } from "react";
import { listAvailabilityWindows, deleteAvailabilityWindow } from "@/lib/actions/availability";
import { CalendarGrid } from "@/components/CalendarGrid";
import { ReminderWindowPicker } from "@/components/ReminderWindowPicker";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AvailabilityWindow } from "@/lib/types/db";
import { Plus, Trash2, RefreshCw } from "lucide-react";

export default function AvailabilityPage() {
  const [windows, setWindows] = useState<AvailabilityWindow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function load() {
    const { data } = await listAvailabilityWindows();
    setWindows(data as AvailabilityWindow[]);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    setLoading(true);
    await deleteAvailabilityWindow(id);
    await load();
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-xl px-4 pt-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Availability</h1>
        <Button
          size="sm"
          variant={showForm ? "secondary" : "primary"}
          onClick={() => setShowForm((v) => !v)}
        >
          <Plus className="h-4 w-4" />
          {showForm ? "Cancel" : "Add window"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New availability window</CardTitle>
          </CardHeader>
          <CardContent>
            <ReminderWindowPicker onSuccess={() => { setShowForm(false); load(); }} />
          </CardContent>
        </Card>
      )}

      {/* Calendar view */}
      <CalendarGrid
        windows={windows}
        onAddWindow={() => setShowForm(true)}
        onClickWindow={() => {}}
      />

      {/* List view */}
      {windows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All windows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {windows.map((w) => {
                const start = new Date(w.start_at);
                const end = new Date(w.end_at);
                return (
                  <div
                    key={w.id}
                    className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {w.label ?? "Available"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}{" "}
                        {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })} –{" "}
                        {end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                      </p>
                      {w.recurrence_rule && (
                        <div className="mt-1 flex items-center gap-1">
                          <RefreshCw className="h-3 w-3 text-teal-500" />
                          <span className="text-[10px] text-teal-500">Recurring</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(w.id)}
                      disabled={loading}
                      className="ml-2 rounded-lg p-1.5 text-slate-600 hover:bg-red-400/10 hover:text-red-400 transition-colors"
                      aria-label="Delete window"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {windows.length === 0 && !showForm && (
        <div className="rounded-2xl border border-white/5 bg-[#13171c] py-12 text-center">
          <p className="text-sm text-slate-500 mb-2">No availability windows yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-sm text-teal-400 hover:underline"
          >
            Add your first window
          </button>
        </div>
      )}
    </div>
  );
}
