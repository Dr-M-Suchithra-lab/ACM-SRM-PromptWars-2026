/**
 * Attendance generated relative to "now": every working day has people on site, rosters
 * follow each sector's pattern, and two demo stories are scripted exactly:
 * - Ramesh: 72 verified days (BOCW progress 72/90) and 13h 32m of overtime this month.
 * - Sunita: three night shifts in a row and a short rest (hospital fatigue rules).
 */
import { monthKey, payFocusMonth } from "@/core/period";
import type { Shift } from "@/core/types";
import type { Worker } from "../repos/types";

const HOUR_MS = 60 * 60 * 1000;
const IST_OFFSET_MS = 5.5 * HOUR_MS;
export const HISTORY_DAYS = 130;

/** Midnight in IST (as a UTC instant) `offset` days from the IST day containing `now`. */
export function istDayStart(now: Date, offset = 0): Date {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + offset) - IST_OFFSET_MS);
}

const istDow = (dayStart: Date) => new Date(dayStart.getTime() + IST_OFFSET_MS).getUTCDay();

function shift(workerId: string, siteId: string, key: string, inAt: Date, minutes: number | null): Shift {
  return {
    id: `shift-${workerId}-${key}`,
    workerId,
    siteId,
    inAt,
    ...(minutes === null ? {} : { outAt: new Date(inAt.getTime() + minutes * 60_000) }),
    method: "qr",
  };
}

// ── Ramesh ─────────────────────────────────────────────────────────

export const RAMESH_VERIFIED_DAYS = 72;
/** Overtime minutes on his last 7 working days this month: 13h 32m in total. */
export const RAMESH_OVERTIME_THIS_MONTH = [110, 92, 100, 105, 120, 135, 150];
const RAMESH_MISSED_DAYS_AGO = new Set([9, 23]);

/** Ramesh's working days, newest first (Mon–Sat, minus two missed days). */
function rameshDays(now: Date): Date[] {
  const days: Date[] = [];
  for (let ago = 1; days.length < RAMESH_VERIFIED_DAYS; ago++) {
    const day = istDayStart(now, -ago);
    if (istDow(day) !== 0 && !RAMESH_MISSED_DAYS_AGO.has(ago)) days.push(day);
  }
  return days;
}

export function rameshJoinedAt(now: Date): Date {
  return rameshDays(now).at(-1)!;
}

function rameshShifts(now: Date): Shift[] {
  const days = rameshDays(now);
  // The month the pay story lives in (see storyMonths in data.ts).
  const thisMonth = payFocusMonth(now);
  const inMonth = days.filter((d) => monthKey(d) === thisMonth).reverse(); // oldest first
  const overtime = new Map<number, number>();
  const otDays = inMonth.slice(-RAMESH_OVERTIME_THIS_MONTH.length);
  // Early in a month there may be fewer than 7 working days so far: keep the latest extras.
  const extras = RAMESH_OVERTIME_THIS_MONTH.slice(RAMESH_OVERTIME_THIS_MONTH.length - otDays.length);
  otDays.forEach((day, i) => overtime.set(day.getTime(), extras[i]));
  // A little overtime in earlier months too, all paid correctly.
  days
    .filter((d) => monthKey(d) !== thisMonth)
    .filter((_, i) => i % 9 === 4)
    .forEach((d) => overtime.set(d.getTime(), 60));

  return days.map((day, i) => {
    // Regular days stay under 8h so the overtime above is exact.
    const minutes = 8 * 60 + (overtime.get(day.getTime()) ?? -(5 + (i % 4) * 4));
    return shift("w1001", "site1", String(i), new Date(day.getTime() + 7.5 * HOUR_MS), minutes);
  });
}

// ── Sunita ─────────────────────────────────────────────────────────

const SUNITA_NIGHTS_DAYS_AGO = [12, 11, 10];
const SUNITA_SHORT_REST_DAYS_AGO = 9;

function sunitaShifts(now: Date, joined: Date): Shift[] {
  const shifts: Shift[] = [];
  for (let ago = 1; ago <= HISTORY_DAYS; ago++) {
    const day = istDayStart(now, -ago);
    if (day < joined) break;
    if (SUNITA_NIGHTS_DAYS_AGO.includes(ago)) {
      shifts.push(shift("w2001", "site2", String(ago), new Date(day.getTime() + 22 * HOUR_MS), 8 * 60));
    } else if (ago === SUNITA_SHORT_REST_DAYS_AGO) {
      // Back at 4 pm after a night ending at 6 am: only 10 hours of rest.
      shifts.push(shift("w2001", "site2", String(ago), new Date(day.getTime() + 16 * HOUR_MS), 8 * 60));
    } else if (istDow(day) !== 3) {
      shifts.push(shift("w2001", "site2", String(ago), new Date(day.getTime() + 8 * HOUR_MS), 8 * 60));
    }
  }
  return shifts;
}

// ── Everyone else ──────────────────────────────────────────────────

interface Pattern {
  attendance: number;
  startHour: number;
  otChance: number;
  otMaxMin: number;
  /** Weekly day off (0 = Sunday) */
  offDow: number;
}

/** Workers whose attendance tells a story on the dashboard. */
const PATTERN_OVERRIDES: Record<string, Partial<Pattern>> = {
  w1006: { attendance: 0.72 }, // Ravi: often absent → individual quit-risk
  w1012: { otChance: 0.55, otMaxMin: 150 }, // Imran: welding crew on long days
  w1009: { otChance: 0.4, otMaxMin: 120 }, // crane operator
  w2005: { otChance: 0.35, otMaxMin: 120 }, // nurse covering double duties
  w2012: { attendance: 0.8 },
};

function patternFor(worker: Worker): Pattern {
  const n = Number(worker.code);
  const base: Pattern =
    worker.orgId === "org1"
      ? { attendance: 0.95, startHour: 7.5 + (n % 3) * 0.5, otChance: 0.15, otMaxMin: 90, offDow: 0 }
      : { attendance: 0.96, startHour: n % 3 === 0 ? 14 : 8, otChance: 0.12, otMaxMin: 60, offDow: n % 7 };
  return { ...base, ...PATTERN_OVERRIDES[worker.id] };
}

function rosterShifts(worker: Worker, now: Date, rand: () => number): Shift[] {
  const pattern = patternFor(worker);
  const shifts: Shift[] = [];
  const minutesFor = () =>
    rand() < pattern.otChance ? 8 * 60 + 20 + Math.round(rand() * pattern.otMaxMin) : 8 * 60 - Math.round(rand() * 20);

  for (let ago = HISTORY_DAYS; ago >= 0; ago--) {
    const day = istDayStart(now, -ago);
    if (day < istDayStart(worker.joinedAt) || istDow(day) === pattern.offDow) continue;
    if (rand() > pattern.attendance) continue;
    const inAt = new Date(day.getTime() + (pattern.startHour + rand() * 0.3) * HOUR_MS);
    const minutes = minutesFor();
    if (ago > 0) {
      shifts.push(shift(worker.id, worker.siteId, String(ago), inAt, minutes));
    } else if (inAt <= now) {
      // Today: still on site, or already gone home.
      const done = inAt.getTime() + minutes * 60_000 <= now.getTime();
      shifts.push(shift(worker.id, worker.siteId, "today", inAt, done ? minutes : null));
    }
  }
  return shifts;
}

export function generateShifts(workers: Worker[], now: Date, rand: () => number): Shift[] {
  return workers.flatMap((worker) => {
    if (worker.id === "w1001") return rameshShifts(now);
    if (worker.id === "w2001") return sunitaShifts(now, worker.joinedAt);
    return rosterShifts(worker, now, rand);
  });
}
