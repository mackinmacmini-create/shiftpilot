import { describe, it, expect } from "vitest";
import { inQuietHours } from "@/app/api/notifications/dispatch/route";

/**
 * Pure-logic tests for dispatcher rules. `inQuietHours` is exported from the
 * route module so test + production behavior cannot drift.
 */

function withinWindowBucket(
  nowMs: number,
  windowStartMs: number,
  minMinutesBefore: number
): boolean {
  const bucketStart = nowMs + minMinutesBefore * 60_000;
  const bucketEnd = bucketStart + 60_000;
  return windowStartMs >= bucketStart && windowStartMs < bucketEnd;
}

describe("dispatcher quiet hours", () => {
  it("returns false when start/end not set", () => {
    expect(inQuietHours("23:00", null, null)).toBe(false);
  });

  it("matches when current time is inside the window", () => {
    expect(inQuietHours("23:30", "22:00", "06:00")).toBe(true);
  });

  it("does not match outside the window", () => {
    expect(inQuietHours("12:00", "22:00", "23:59")).toBe(false);
  });

  it("matches before midnight in an overnight window", () => {
    expect(inQuietHours("23:30", "22:00", "06:00")).toBe(true);
  });

  it("matches after midnight in an overnight window", () => {
    expect(inQuietHours("02:30", "22:00", "06:00")).toBe(true);
  });

  it("does not match daytime in an overnight window", () => {
    expect(inQuietHours("12:00", "22:00", "06:00")).toBe(false);
  });

  it("returns false when start equals end", () => {
    expect(inQuietHours("08:00", "08:00", "08:00")).toBe(false);
  });
});

describe("dispatcher bucket window", () => {
  const now = Date.parse("2026-06-18T09:00:00Z");

  it("matches a window starting exactly at min_minutes_before", () => {
    const window = now + 30 * 60_000;
    expect(withinWindowBucket(now, window, 30)).toBe(true);
  });

  it("does not match a window outside the 1-minute bucket", () => {
    const window = now + 32 * 60_000;
    expect(withinWindowBucket(now, window, 30)).toBe(false);
  });

  it("does not match a window in the past", () => {
    const window = now - 5 * 60_000;
    expect(withinWindowBucket(now, window, 30)).toBe(false);
  });
});
