// ─── FairShift Overtime Computation ─────────────────────────────────
// For each IST week, overtime is computed both daily and weekly, and the
// method yielding MORE overtime (more favourable to the worker) wins.
// Weeks are evaluated independently so multi-week periods (monthly payslips)
// never apply a single 48h limit to the whole period.

import { ClosedShift, LabourRules } from "./types";
import { getISTWeekBucket, splitShiftByDay } from "./time";

export const DEFAULT_LABOUR_RULES: LabourRules = {
  dailyHrs: 8,
  weeklyHrs: 48,
  otMultiplier: 2,
};

export type OvertimeBasis = "daily" | "weekly" | "mixed" | "none";

export interface WeekOvertime {
  week: string;
  totalMin: number;
  dailyOtMin: number;
  weeklyOtMin: number;
  overtimeMin: number;
  basis: "daily" | "weekly";
}

export interface OvertimeResult {
  regularMin: number;
  overtimeMin: number;
  basis: OvertimeBasis;
  weeks: WeekOvertime[];
}

/** Minutes worked per IST day, keyed 'YYYY-MM-DD'. */
export function minutesByDay(shifts: ClosedShift[]): Map<string, number> {
  const byDay = new Map<string, number>();
  for (const shift of shifts) {
    for (const seg of splitShiftByDay(shift)) {
      byDay.set(seg.day, (byDay.get(seg.day) ?? 0) + seg.minutes);
    }
  }
  return byDay;
}

export function computeOvertime(shifts: ClosedShift[], rules: LabourRules = DEFAULT_LABOUR_RULES): OvertimeResult {
  const dailyLimitMin = rules.dailyHrs * 60;
  const weeklyLimitMin = rules.weeklyHrs * 60;

  const weeksMap = new Map<string, number[]>();
  for (const [day, minutes] of minutesByDay(shifts)) {
    const week = getISTWeekBucket(new Date(`${day}T12:00:00+05:30`));
    const days = weeksMap.get(week) ?? [];
    days.push(minutes);
    weeksMap.set(week, days);
  }

  const weeks: WeekOvertime[] = [...weeksMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, dayMinutes]) => {
      const totalMin = dayMinutes.reduce((sum, m) => sum + m, 0);
      const dailyOtMin = dayMinutes.reduce((sum, m) => sum + Math.max(0, m - dailyLimitMin), 0);
      const weeklyOtMin = Math.max(0, totalMin - weeklyLimitMin);
      const useDaily = dailyOtMin >= weeklyOtMin;
      return {
        week,
        totalMin,
        dailyOtMin,
        weeklyOtMin,
        overtimeMin: useDaily ? dailyOtMin : weeklyOtMin,
        basis: useDaily ? "daily" : "weekly",
      };
    });

  const totalMin = weeks.reduce((sum, w) => sum + w.totalMin, 0);
  const overtimeMin = weeks.reduce((sum, w) => sum + w.overtimeMin, 0);
  const otWeeks = weeks.filter((w) => w.overtimeMin > 0);
  const bases = new Set(otWeeks.map((w) => w.basis));
  const basis: OvertimeBasis = bases.size === 0 ? "none" : bases.size > 1 ? "mixed" : otWeeks[0].basis;

  return { regularMin: totalMin - overtimeMin, overtimeMin, basis, weeks };
}
