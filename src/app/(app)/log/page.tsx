"use client";

import { useEffect, useState } from "react";
import { listOpportunities, deleteOpportunity } from "@/lib/actions/opportunities";
import { listStations } from "@/lib/actions/stations";
import { OpportunityForm } from "@/components/OpportunityForm";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OpportunityLog, Station } from "@/lib/types/db";
import { formatCents, OUTCOME_COLORS, durationMinutes, formatMinutes } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

export default function LogPage() {
  const [logs, setLogs] = useState<OpportunityLog[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  async function load(p = 0) {
    const [{ data: l, count: c }, { data: s }] = await Promise.all([
      listOpportunities({ limit: PAGE_SIZE, offset: p * PAGE_SIZE }),
      listStations(),
    ]);
    setLogs(l as OpportunityLog[]);
    setCount(c);
    setStations(s as Station[]);
    setPage(p);
  }

  useEffect(() => { load(0); }, []);

  async function handleDelete(id: string) {
    await deleteOpportunity(id);
    await load(page);
  }

  return (
    <div className="mx-auto max-w-xl px-4 pt-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Opportunity log</h1>
        <Button
          size="sm"
          variant={showForm ? "secondary" : "primary"}
          onClick={() => setShowForm((v) => !v)}
        >
          <Plus className="h-4 w-4" />
          {showForm ? "Cancel" : "Log opportunity"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Log a new opportunity</CardTitle>
          </CardHeader>
          <CardContent>
            <OpportunityForm
              stations={stations}
              onSuccess={() => { setShowForm(false); load(0); }}
            />
          </CardContent>
        </Card>
      )}

      {/* Log list */}
      {logs.length === 0 && !showForm ? (
        <div className="rounded-2xl border border-white/5 bg-[#13171c] py-12 text-center">
          <p className="text-sm text-slate-500 mb-2">No opportunities logged yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-sm text-teal-400 hover:underline"
          >
            Log your first one
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const start = new Date(log.start_at);
            const end = new Date(log.end_at);
            const duration = durationMinutes(log.start_at, log.end_at);
            return (
              <Card key={log.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={OUTCOME_COLORS[log.outcome]}>{log.outcome}</Badge>
                      <span className="text-sm font-semibold text-white">
                        {formatCents(log.offered_pay_cents)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      {" · "}
                      {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })} –{" "}
                      {end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                      {" · "}
                      {formatMinutes(duration)}
                    </p>
                    {log.station && (
                      <p className="mt-0.5 text-xs text-slate-500">{log.station.name}</p>
                    )}
                    {log.notes && (
                      <p className="mt-1 text-xs text-slate-500 italic truncate">{log.notes}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="rounded-lg p-1.5 text-slate-600 hover:bg-red-400/10 hover:text-red-400 transition-colors shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            );
          })}

          {/* Pagination */}
          {count > PAGE_SIZE && (
            <div className="flex justify-center gap-3 pt-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={page === 0}
                onClick={() => load(page - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center text-xs text-slate-500">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, count)} of {count}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={(page + 1) * PAGE_SIZE >= count}
                onClick={() => load(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
