// ─── FairShift Time Utilities ───────────────────────────────────────
// All functions operate in Asia/Kolkata (IST, UTC+05:30).
// No Date.now() — current time is always passed as a parameter.

import { ClosedShift } from "./types";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +05:30 in ms

/**
 * Returns a new Date shifted so that its UTC methods reflect IST values.
 * E.g., toIST(d).getUTCHours() gives the IST hour.
 */
export function toIST(date: Date): Date {
  return new Date(date.getTime() + IST_OFFSET_MS);
}

/** Returns 'YYYY-MM-DD' in IST. */
export function getISTDay(date: Date): string {
  const ist = toIST(date);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const d = String(ist.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Returns the Monday-based week start date string in IST ('YYYY-MM-DD').
 * ISO weeks start on Monday (day 1).
 */
export function getISTWeekStart(date: Date): string {
  const ist = toIST(date);
  const dow = ist.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const mondayOffset = dow === 0 ? 6 : dow - 1; // days since Monday
  const monday = new Date(ist.getTime() - mondayOffset * 24 * 60 * 60 * 1000);
  const y = monday.getUTCFullYear();
  const m = String(monday.getUTCMonth() + 1).padStart(2, "0");
  const d = String(monday.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Returns ISO week bucket in 'YYYY-Www' format (e.g. '2024-W03').
 */
export function getISTWeekBucket(date: Date): string {
  const ist = toIST(date);
  // ISO week: the week containing the year's first Thursday is week 1.
  // Find the nearest Thursday to get ISO year/week
  const target = new Date(ist.getTime());
  const dayOfWeek = target.getUTCDay();
  // Adjust to Thursday: Thursday is day 4
  const thursdayOffset = dayOfWeek === 0 ? -3 : 4 - dayOfWeek;
  const thursday = new Date(target.getTime() + thursdayOffset * 24 * 60 * 60 * 1000);

  const isoYear = thursday.getUTCFullYear();
  const jan1OfIsoYear = new Date(Date.UTC(isoYear, 0, 1));
  const daysSinceJan1 = Math.floor((thursday.getTime() - jan1OfIsoYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNum = Math.floor(daysSinceJan1 / 7) + 1;

  return `${isoYear}-W${String(weekNum).padStart(2, "0")}`;
}

/**
 * Splits a closed shift that may cross midnight(s) into per-IST-day minute counts.
 */
export function splitShiftByDay(shift: ClosedShift): { day: string; minutes: number }[] {
  const result: { day: string; minutes: number }[] = [];

  const startMs = shift.inAt.getTime();
  const endMs = shift.outAt.getTime();

  if (endMs <= startMs) return result;

  let cursorMs = startMs;

  while (cursorMs < endMs) {
    const cursorIST = toIST(new Date(cursorMs));
    const day = getISTDay(new Date(cursorMs));

    // Find start of next IST day: midnight of cursorIST date + 1 day, then convert back to UTC
    const nextDayIST = new Date(
      Date.UTC(cursorIST.getUTCFullYear(), cursorIST.getUTCMonth(), cursorIST.getUTCDate() + 1),
    );
    const nextDayUTC = nextDayIST.getTime() - IST_OFFSET_MS; // convert IST midnight back to UTC

    const segmentEndMs = Math.min(nextDayUTC, endMs);
    const minutes = Math.round((segmentEndMs - cursorMs) / (60 * 1000));

    if (minutes > 0) {
      result.push({ day, minutes });
    }

    cursorMs = segmentEndMs;
  }

  return result;
}

/**
 * Returns true if any part of the shift falls between 22:00-06:00 IST.
 */
export function isNightShift(shift: ClosedShift): boolean {
  const startMs = shift.inAt.getTime();
  const endMs = shift.outAt.getTime();

  if (endMs <= startMs) return false;

  // Check every IST day that the shift spans
  // Night window: 22:00 IST to 06:00 IST next day
  const startIST = toIST(shift.inAt);
  const endIST = toIST(shift.outAt);

  // We need to check if shift overlaps [22:00, 06:00) on any day it spans.
  // Strategy: iterate over each possible night window that could overlap.
  // Start from the day before the shift start to the day of the shift end.

  const firstDayMs = Date.UTC(startIST.getUTCFullYear(), startIST.getUTCMonth(), startIST.getUTCDate());
  const lastDayMs = Date.UTC(endIST.getUTCFullYear(), endIST.getUTCMonth(), endIST.getUTCDate());

  // Check from day before first to last day
  const oneDayMs = 24 * 60 * 60 * 1000;
  for (let dayMs = firstDayMs - oneDayMs; dayMs <= lastDayMs; dayMs += oneDayMs) {
    // Night window: 22:00 IST on this day to 06:00 IST next day
    const nightStartIST = dayMs + 22 * 60 * 60 * 1000; // 22:00 IST in IST-adjusted ms
    const nightEndIST = dayMs + 30 * 60 * 60 * 1000; // 06:00 next day IST in IST-adjusted ms

    // Convert back to UTC
    const nightStartUTC = nightStartIST - IST_OFFSET_MS;
    const nightEndUTC = nightEndIST - IST_OFFSET_MS;

    // Check overlap: shift [startMs, endMs) overlaps [nightStartUTC, nightEndUTC)
    if (startMs < nightEndUTC && endMs > nightStartUTC) {
      return true;
    }
  }

  return false;
}

/** Total minutes of a closed shift. */
export function getShiftMinutes(shift: ClosedShift): number {
  return Math.round((shift.outAt.getTime() - shift.inAt.getTime()) / (60 * 1000));
}
