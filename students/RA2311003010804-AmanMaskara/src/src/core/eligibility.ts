// ─── Benefits Unlocker: welfare eligibility from verified attendance ─
// Pure evaluation of the rules in config/schemes.ts. Facts FairShift cannot know (age,
// existing PF/ESIC membership) arrive as yes/no answers from the worker's own device and
// are never stored on the server.

import type { ConditionId, Scheme } from "@/config/schemes";
import { getISTDay, toIST } from "./time";
import type { Sector } from "./types";

export interface AttendanceDay {
  /** IST calendar day, 'YYYY-MM-DD' */
  day: string;
  sector: Sector;
}

export interface EligibilityWorker {
  sector: Sector;
  /** Monthly wage in paise */
  monthlyWage: number;
}

export type ConditionAnswers = Partial<Record<ConditionId, boolean>>;

export interface SchemeEligibility {
  schemeId: string;
  eligible: boolean;
  progress: { done: number; needed: number };
  daysRemaining: number;
  /** Conditions the worker has not answered yet */
  missingConditions: ConditionId[];
  /** Rules that rule the worker out: a "no" answer, or a wage above the ceiling */
  failedConditions: (ConditionId | "max_monthly_wage")[];
  window: { from: string; to: string };
}

/** First IST day of the eligibility window: the same calendar day `months` months ago (inclusive). */
export function windowStart(now: Date, months: number): string {
  const ist = toIST(now);
  const start = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() - months, ist.getUTCDate()));
  return start.toISOString().slice(0, 10);
}

function daysWorked(days: AttendanceDay[], scheme: Scheme, from: string, to: string): number {
  const counted = new Set<string>();
  for (const { day, sector } of days) {
    if (day < from || day > to) continue;
    if (scheme.rule.workType === "building" && sector !== "construction") continue;
    counted.add(day);
  }
  return counted.size;
}

/** Evaluate every scheme that applies to the worker's sector. */
export function checkEligibility(
  worker: EligibilityWorker,
  attendanceDays: AttendanceDay[],
  schemes: readonly Scheme[],
  now: Date,
  answers: ConditionAnswers = {},
): SchemeEligibility[] {
  const today = getISTDay(now);
  return schemes
    .filter((scheme) => scheme.sectors.includes(worker.sector))
    .map((scheme) => {
      const from = windowStart(now, scheme.rule.windowMonths);
      const done = Math.min(daysWorked(attendanceDays, scheme, from, today), scheme.rule.minDays);
      const daysRemaining = scheme.rule.minDays - done;
      const missingConditions = scheme.conditions.filter((c) => answers[c] === undefined);
      const failedConditions: SchemeEligibility["failedConditions"] = scheme.conditions.filter(
        (c) => answers[c] === false,
      );
      const ceiling = scheme.rule.maxMonthlyWage;
      if (ceiling !== undefined && worker.monthlyWage > ceiling) failedConditions.push("max_monthly_wage");

      return {
        schemeId: scheme.id,
        eligible: daysRemaining === 0 && missingConditions.length === 0 && failedConditions.length === 0,
        progress: { done, needed: scheme.rule.minDays },
        daysRemaining,
        missingConditions,
        failedConditions,
        window: { from, to: today },
      };
    });
}

/** True when the attendance rule is met: the worker can ask the employer for a work certificate. */
export function attendanceRuleMet(result: SchemeEligibility): boolean {
  return result.daysRemaining === 0 && !result.failedConditions.includes("max_monthly_wage");
}
