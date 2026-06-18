/**
 * True when `current` (HH:MM) falls inside [start, end].
 * Handles overnight wrap-around: e.g. quiet hours 22:00 → 06:00 covers 23:30.
 * Shared helper so the dispatcher route + unit tests can both consume it
 * without re-exporting from a Next.js route file (which rejects non-handler exports).
 */
export function inQuietHours(
  current: string,
  start: string | null | undefined,
  end: string | null | undefined
): boolean {
  if (!start || !end) return false;
  if (start === end) return false;
  if (start < end) {
    return current >= start && current <= end;
  }
  return current >= start || current <= end;
}
