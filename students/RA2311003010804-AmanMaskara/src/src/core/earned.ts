// ─── "Earned so far" ────────────────────────────────────────────────
// The home-screen counter reuses the payslip engine on month-to-date shifts, so the
// number a worker sees on the home screen and on the payslip can never disagree.

import { computePayslip } from "./pay";
import { monthKey, monthRange } from "./period";
import { getISTDay } from "./time";
import type { ClosedShift, LabourRules, PayConfig } from "./types";

export interface EarnedSoFar {
  /** 'YYYY-MM' of the current IST month */
  month: string;
  /** Gross (before deductions) for closed shifts this month, in paise */
  monthGross: number;
  /** Part of monthGross earned on today's shifts, in paise */
  todayGross: number;
}

export function earnedSoFar(shifts: ClosedShift[], pay: PayConfig, rules: LabourRules, now: Date): EarnedSoFar {
  const month = monthKey(now);
  const { start, end } = monthRange(month);
  const inMonth = shifts.filter((s) => s.inAt >= start && s.inAt < end);
  const today = getISTDay(now);
  const beforeToday = inMonth.filter((s) => getISTDay(s.inAt) !== today);

  const gross = (list: ClosedShift[]) => computePayslip("", month, list, pay, rules).gross;
  const monthGross = gross(inMonth);
  // Overtime is weekly-aware, so today's share is the difference, not today's shifts alone.
  return { month, monthGross, todayGross: Math.max(0, monthGross - gross(beforeToday)) };
}
