"use client";

import { useEffect, useState } from "react";
import { listDesiredBlocks, deleteDesiredBlock } from "@/lib/actions/wishlist";
import { listStations } from "@/lib/actions/stations";
import { WishlistEditor } from "@/components/WishlistEditor";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DesiredBlock, Station } from "@/lib/types/db";
import { formatCents, formatMinutes, DOW_LABELS, PLATFORM_LABELS } from "@/lib/utils";
import { Plus, Trash2, Clock, DollarSign } from "lucide-react";

export default function WishlistPage() {
  const [blocks, setBlocks] = useState<DesiredBlock[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const [{ data: b }, { data: s }] = await Promise.all([
      listDesiredBlocks(),
      listStations(),
    ]);
    setBlocks(b as DesiredBlock[]);
    setStations(s as Station[]);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    await deleteDesiredBlock(id);
    await load();
  }

  return (
    <div className="mx-auto max-w-xl px-4 pt-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Block wishlist</h1>
        <Button
          size="sm"
          variant={showForm ? "secondary" : "primary"}
          onClick={() => setShowForm((v) => !v)}
        >
          <Plus className="h-4 w-4" />
          {showForm ? "Cancel" : "Add rule"}
        </Button>
      </div>

      <p className="text-sm text-slate-400">
        Define the kinds of blocks you want. ShiftPilot will remind you when your availability windows match these preferences.
      </p>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New wishlist rule</CardTitle>
          </CardHeader>
          <CardContent>
            <WishlistEditor stations={stations} onSuccess={() => { setShowForm(false); load(); }} />
          </CardContent>
        </Card>
      )}

      {blocks.length === 0 && !showForm ? (
        <div className="rounded-2xl border border-white/5 bg-[#13171c] py-12 text-center">
          <p className="text-sm text-slate-500 mb-2">No wishlist rules yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-sm text-teal-400 hover:underline"
          >
            Add your first rule
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {blocks.map((b) => {
            const station = b.station;
            const dayLabel = b.day_of_week !== null ? DOW_LABELS[b.day_of_week] : "Any day";
            const platform = station ? (PLATFORM_LABELS[station.platform] ?? station.platform) : null;
            return (
              <Card key={b.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="rounded-full bg-teal-400/10 px-2.5 py-0.5 text-xs text-teal-400">
                        {dayLabel}
                      </span>
                      {station && (
                        <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-slate-300">
                          {station.code} {platform ? `· ${platform}` : ""}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                      {b.start_time && b.end_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {b.start_time} – {b.end_time}
                        </span>
                      )}
                      {b.min_pay_cents && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Min {formatCents(b.min_pay_cents)}
                        </span>
                      )}
                      {b.min_duration_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Min {formatMinutes(b.min_duration_minutes)}
                        </span>
                      )}
                    </div>
                    {b.notes && (
                      <p className="mt-1 text-xs text-slate-500 italic">{b.notes}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(b.id)}
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
