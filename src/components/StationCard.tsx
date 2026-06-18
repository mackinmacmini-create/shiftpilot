import type { Station, DriverStationPreference } from "@/lib/types/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLATFORM_LABELS } from "@/lib/utils";
import { MapPin, Star } from "lucide-react";

interface StationCardProps {
  station: Station;
  preference?: DriverStationPreference;
  onAdd?: (stationId: string) => void;
  onRemove?: (preferenceId: string) => void;
}

export function StationCard({ station, preference, onAdd, onRemove }: StationCardProps) {
  const platformLabel = PLATFORM_LABELS[station.platform] ?? station.platform;

  return (
    <Card className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-white truncate">{station.name}</span>
          <Badge variant="muted" className="shrink-0 text-[10px]">
            {station.code}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <MapPin className="h-3 w-3 shrink-0" />
          <span>
            {station.city}
            {station.state ? `, ${station.state}` : ""}
          </span>
          <span className="text-slate-700">·</span>
          <span>{platformLabel}</span>
        </div>
        {preference && (
          <div className="mt-2 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3 w-3 ${
                  i < preference.priority ? "fill-teal-400 text-teal-400" : "text-slate-700"
                }`}
              />
            ))}
            <span className="ml-1 text-[10px] text-slate-500">Priority {preference.priority}</span>
          </div>
        )}
      </div>
      <div className="shrink-0">
        {preference ? (
          <button
            onClick={() => onRemove?.(preference.id)}
            className="rounded-lg px-3 py-1.5 text-xs text-red-400 hover:bg-red-400/10 transition-colors"
          >
            Remove
          </button>
        ) : (
          <button
            onClick={() => onAdd?.(station.id)}
            className="rounded-lg border border-teal-400/30 px-3 py-1.5 text-xs text-teal-400 hover:bg-teal-400/10 transition-colors"
          >
            Add
          </button>
        )}
      </div>
    </Card>
  );
}
