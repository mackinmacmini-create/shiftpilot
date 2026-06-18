"use client";

import { useState } from "react";
import type { AvailabilityWindow } from "@/lib/types/db";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarGridProps {
  windows: AvailabilityWindow[];
  onAddWindow?: (date: Date) => void;
  onClickWindow?: (window: AvailabilityWindow) => void;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 5); // 5 AM to 10 PM
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarGrid({ windows, onAddWindow, onClickWindow }: CalendarGridProps) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  function prevWeek() {
    setWeekStart((w) => {
      const d = new Date(w);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }

  function nextWeek() {
    setWeekStart((w) => {
      const d = new Date(w);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }

  function windowsForDay(day: Date): AvailabilityWindow[] {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    return windows.filter((w) => {
      const s = new Date(w.start_at);
      return s >= dayStart && s <= dayEnd;
    });
  }

  const monthLabel = weekDays[0].toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="rounded-2xl border border-white/5 bg-[#13171c] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <button
          onClick={prevWeek}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
          aria-label="Previous week"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-white">{monthLabel}</span>
        <button
          onClick={nextWeek}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
          aria-label="Next week"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-white/5">
        {weekDays.map((day, i) => {
          const isToday = day.toDateString() === new Date().toDateString();
          return (
            <div
              key={i}
              className={cn(
                "flex flex-col items-center py-2 text-center",
                i < 6 && "border-r border-white/5"
              )}
            >
              <span className="text-[10px] text-slate-500">{DAYS[i]}</span>
              <span
                className={cn(
                  "mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                  isToday
                    ? "bg-teal-400 text-slate-900"
                    : "text-white"
                )}
              >
                {day.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Time grid — simplified block view */}
      <div className="max-h-80 overflow-y-auto">
        {weekDays.map((day, di) => {
          const dayWindows = windowsForDay(day);
          return (
            <div key={di} className="border-b border-white/5 last:border-0">
              {dayWindows.length > 0 ? (
                dayWindows.map((w) => {
                  const start = new Date(w.start_at);
                  const end = new Date(w.end_at);
                  const label = w.label ?? "Available";
                  const timeStr = `${start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })} – ${end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
                  return (
                    <button
                      key={w.id}
                      onClick={() => onClickWindow?.(w)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5 transition-colors"
                    >
                      <div className="h-2 w-2 rounded-full bg-teal-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">{label}</p>
                        <p className="text-[10px] text-slate-500">{timeStr}</p>
                      </div>
                      <span className="ml-auto text-[10px] text-slate-600">
                        {DAYS[di]}
                      </span>
                    </button>
                  );
                })
              ) : null}
            </div>
          );
        })}
        {windows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm text-slate-500">No windows this week.</p>
            <button
              onClick={() => onAddWindow?.(new Date())}
              className="mt-2 text-sm text-teal-400 hover:underline"
            >
              Add your first window
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
