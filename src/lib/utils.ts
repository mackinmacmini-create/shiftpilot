import type { ClassValue } from "clsx";

/** Minimal cn() — concatenate class names, filtering falsy values. */
export function cn(...inputs: ClassValue[]): string {
  return inputs
    .flat()
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Format cents to dollars string, e.g. 2550 → "$25.50" */
export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/** Format minutes to "Xh Ym" */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Duration between two ISO strings in minutes */
export function durationMinutes(startAt: string, endAt: string): number {
  return Math.round(
    (new Date(endAt).getTime() - new Date(startAt).getTime()) / 60_000
  );
}

/** Pay rate in dollars per hour given cents and minutes */
export function payRatePerHour(cents: number, minutes: number): number {
  if (minutes <= 0) return 0;
  return (cents / 100) / (minutes / 60);
}

/** Short day-of-week name from 0–6 (0 = Sunday) */
export const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Tailwind-safe outcome badge colors */
export const OUTCOME_COLORS: Record<string, string> = {
  grabbed: "text-emerald-400 bg-emerald-400/10",
  passed: "text-slate-400 bg-slate-400/10",
  missed: "text-amber-400 bg-amber-400/10",
  cancelled: "text-red-400 bg-red-400/10",
};

/** Platform display names */
export const PLATFORM_LABELS: Record<string, string> = {
  amazon_flex: "Amazon Flex",
  uber_eats: "Uber Eats",
  doordash: "DoorDash",
  instacart: "Instacart",
  other: "Other",
};
