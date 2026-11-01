// ─── FairShift Fatigue Detection ────────────────────────────────────
// Pure computation — no I/O, no Date.now().
// `now` is passed in to determine "current" day/week context.

import { ClosedShift, FatigueAlert, FatigueRuleConfig } from "./types";
import { splitShiftByDay, isNightShift, getISTDay, getISTWeekBucket, getShiftMinutes } from "./time";

/**
 * Check a set of closed shifts against fatigue rules and return alerts.
 *
 * @param shifts - All recent shifts for the worker (should span at least the last 2 weeks).
 * @param rules - Fatigue rules to check against.
 * @param now - Current time (used to determine "today" and "this week").
 */
export function checkFatigue(shifts: ClosedShift[], rules: FatigueRuleConfig[], now: Date): FatigueAlert[] {
  const alerts: FatigueAlert[] = [];

  // Sort shifts by inAt ascending
  const sorted = [...shifts].sort((a, b) => a.inAt.getTime() - b.inAt.getTime());

  for (const rule of rules) {
    switch (rule.check) {
      case "maxDailyHours":
        alerts.push(...checkMaxDailyHours(sorted, rule));
        break;
      case "minRestHours":
        alerts.push(...checkMinRestHours(sorted, rule));
        break;
      case "maxConsecutiveDays":
        alerts.push(...checkMaxConsecutiveDays(sorted, rule));
        break;
      case "maxConsecutiveNights":
        alerts.push(...checkMaxConsecutiveNights(sorted, rule));
        break;
      case "maxWeeklyHours":
        alerts.push(...checkMaxWeeklyHours(sorted, rule, now));
        break;
    }
  }

  return alerts;
}

// ─── Rule Implementations ───────────────────────────────────────────

function checkMaxDailyHours(shifts: ClosedShift[], rule: FatigueRuleConfig): FatigueAlert[] {
  const alerts: FatigueAlert[] = [];
  const dayMinutes = new Map<string, number>();

  for (const shift of shifts) {
    for (const seg of splitShiftByDay(shift)) {
      dayMinutes.set(seg.day, (dayMinutes.get(seg.day) ?? 0) + seg.minutes);
    }
  }

  const thresholdMin = rule.threshold * 60;
  for (const [day, mins] of dayMinutes) {
    if (mins > thresholdMin) {
      alerts.push({
        ruleId: rule.ruleId,
        messageKey: "fatigue.maxDailyHours",
        evidence: { day, minutes: mins, threshold: rule.threshold },
      });
    }
  }

  return alerts;
}

function checkMinRestHours(shifts: ClosedShift[], rule: FatigueRuleConfig): FatigueAlert[] {
  const alerts: FatigueAlert[] = [];
  const thresholdMs = rule.threshold * 60 * 60 * 1000;

  for (let i = 1; i < shifts.length; i++) {
    const gap = shifts[i].inAt.getTime() - shifts[i - 1].outAt.getTime();
    if (gap < thresholdMs) {
      const gapHours = Math.round((gap / (60 * 60 * 1000)) * 10) / 10;
      alerts.push({
        ruleId: rule.ruleId,
        messageKey: "fatigue.minRestHours",
        evidence: {
          gapHours,
          threshold: rule.threshold,
          betweenShifts: [shifts[i - 1].id, shifts[i].id],
        },
      });
    }
  }

  return alerts;
}

function checkMaxConsecutiveDays(shifts: ClosedShift[], rule: FatigueRuleConfig): FatigueAlert[] {
  // Collect unique IST days with shifts
  const daysSet = new Set<string>();
  for (const shift of shifts) {
    daysSet.add(getISTDay(shift.inAt));
  }

  const days = [...daysSet].sort();
  if (days.length === 0) return [];

  // Find max consecutive run of days
  let maxRun = 1;
  let currentRun = 1;
  let runEndDay = days[0];

  for (let i = 1; i < days.length; i++) {
    const prevDate = new Date(days[i - 1] + "T00:00:00Z");
    const currDate = new Date(days[i] + "T00:00:00Z");
    const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000));

    if (diffDays === 1) {
      currentRun++;
      if (currentRun > maxRun) {
        maxRun = currentRun;
        runEndDay = days[i];
      }
    } else {
      currentRun = 1;
    }
  }

  if (maxRun > rule.threshold) {
    return [
      {
        ruleId: rule.ruleId,
        messageKey: "fatigue.maxConsecutiveDays",
        evidence: { consecutiveDays: maxRun, threshold: rule.threshold, lastDay: runEndDay },
      },
    ];
  }

  return [];
}

function checkMaxConsecutiveNights(shifts: ClosedShift[], rule: FatigueRuleConfig): FatigueAlert[] {
  // Get IST days for night shifts only
  const nightDays: string[] = [];
  for (const shift of shifts) {
    if (isNightShift(shift)) {
      const day = getISTDay(shift.inAt);
      if (!nightDays.includes(day)) {
        nightDays.push(day);
      }
    }
  }

  nightDays.sort();
  if (nightDays.length === 0) return [];

  let maxRun = 1;
  let currentRun = 1;

  for (let i = 1; i < nightDays.length; i++) {
    const prevDate = new Date(nightDays[i - 1] + "T00:00:00Z");
    const currDate = new Date(nightDays[i] + "T00:00:00Z");
    const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000));

    if (diffDays === 1) {
      currentRun++;
      if (currentRun > maxRun) {
        maxRun = currentRun;
      }
    } else {
      currentRun = 1;
    }
  }

  if (maxRun > rule.threshold) {
    return [
      {
        ruleId: rule.ruleId,
        messageKey: "fatigue.maxConsecutiveNights",
        evidence: { consecutiveNights: maxRun, threshold: rule.threshold },
      },
    ];
  }

  return [];
}

function checkMaxWeeklyHours(shifts: ClosedShift[], rule: FatigueRuleConfig, now: Date): FatigueAlert[] {
  const currentWeek = getISTWeekBucket(now);
  let weekMinutes = 0;

  for (const shift of shifts) {
    if (getISTWeekBucket(shift.inAt) === currentWeek) {
      weekMinutes += getShiftMinutes(shift);
    }
  }

  const thresholdMin = rule.threshold * 60;
  if (weekMinutes > thresholdMin) {
    return [
      {
        ruleId: rule.ruleId,
        messageKey: "fatigue.maxWeeklyHours",
        evidence: {
          weekMinutes,
          weekHours: Math.round((weekMinutes / 60) * 10) / 10,
          threshold: rule.threshold,
          week: currentWeek,
        },
      },
    ];
  }

  return [];
}
