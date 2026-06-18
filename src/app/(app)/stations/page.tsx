"use client";

import { useEffect, useState, useTransition } from "react";
import { listStations, listMyPreferences, addPreference, removePreference } from "@/lib/actions/stations";
import { StationCard } from "@/components/StationCard";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Station, DriverStationPreference } from "@/lib/types/db";
import { PLATFORM_LABELS } from "@/lib/utils";
import { Search } from "lucide-react";

export default function StationsPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [preferences, setPreferences] = useState<DriverStationPreference[]>([]);
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("");
  const [isPending, startTransition] = useTransition();

  async function load() {
    const [{ data: s }, { data: p }] = await Promise.all([
      listStations({ search: search || undefined, platform: platform || undefined }),
      listMyPreferences(),
    ]);
    setStations(s as Station[]);
    setPreferences(p as DriverStationPreference[]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, platform]);

  function prefForStation(stationId: string) {
    return preferences.find((p) => p.station_id === stationId);
  }

  function handleAdd(stationId: string) {
    startTransition(async () => {
      await addPreference({ station_id: stationId, priority: 3 });
      await load();
    });
  }

  function handleRemove(prefId: string) {
    startTransition(async () => {
      await removePreference(prefId);
      await load();
    });
  }

  const myStations = stations.filter((s) => prefForStation(s.id));
  const otherStations = stations.filter((s) => !prefForStation(s.id));

  return (
    <div className="mx-auto max-w-xl px-4 pt-6 space-y-5">
      <h1 className="text-xl font-bold text-white">Stations</h1>

      {/* Search & filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search stations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-36">
          <option value="">All platforms</option>
          {Object.entries(PLATFORM_LABELS).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {/* My preferred stations */}
      {myStations.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            My preferences ({myStations.length})
          </h2>
          <div className="space-y-2">
            {myStations.map((s) => (
              <StationCard
                key={s.id}
                station={s}
                preference={prefForStation(s.id)}
                onRemove={handleRemove}
              />
            ))}
          </div>
        </section>
      )}

      {/* Available stations */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          {myStations.length > 0 ? "All stations" : "Available stations"} ({otherStations.length})
        </h2>
        {otherStations.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-[#13171c] py-10 text-center">
            <p className="text-sm text-slate-500">No stations found. Try adjusting your search.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {otherStations.map((s) => (
              <StationCard key={s.id} station={s} onAdd={handleAdd} />
            ))}
          </div>
        )}
        {isPending && <p className="text-center text-xs text-slate-500 mt-2">Saving...</p>}
      </section>
    </div>
  );
}
