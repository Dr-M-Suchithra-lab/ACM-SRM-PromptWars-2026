export interface ShiftInterval {
  id?: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
}

export interface FatigueCheckResult {
  hasFatigueRisk: boolean;
  restHoursViolated: boolean;
  consecutiveDaysViolated: boolean;
  lastRestHours?: number;
  consecutiveDaysWorked: number;
  reasons: string[];
}

/**
 * Checks for fatigue hazards based on rest duration (< 10 hours)
 * and consecutive working days (>= 6 days).
 * Strict Rule: Returns the structural reason, never a pejorative label for the human worker.
 */
export function checkFatigue(
  shifts: ShiftInterval[],
  minRestHours = 10,
  maxConsecutiveDays = 6
): FatigueCheckResult {
  if (!shifts || shifts.length === 0) {
    return {
      hasFatigueRisk: false,
      restHoursViolated: false,
      consecutiveDaysViolated: false,
      consecutiveDaysWorked: 0,
      reasons: [],
    };
  }

  // Sort shifts chronologically by startTime
  const sorted = [...shifts].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const reasons: string[] = [];
  let restHoursViolated = false;
  let lastRestHours: number | undefined;

  // 1. Check rest periods between consecutive shifts
  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = new Date(sorted[i - 1].endTime).getTime();
    const currStart = new Date(sorted[i].startTime).getTime();

    // Rest interval in hours
    const restDurationHours = (currStart - prevEnd) / (1000 * 60 * 60);

    if (i === sorted.length - 1) {
      lastRestHours = Number(Math.max(0, restDurationHours).toFixed(1));
    }

    if (restDurationHours < minRestHours) {
      restHoursViolated = true;
      const formattedRest = Math.max(0, restDurationHours).toFixed(1);
      reasons.push(
        `Rest duration between shift ${i} and shift ${i + 1} was ${formattedRest} hours (statutory minimum is ${minRestHours} hours).`
      );
    }
  }

  // 2. Check consecutive days worked
  const shiftDates = Array.from(
    new Set(
      sorted.map((s) => new Date(s.startTime).toISOString().slice(0, 10))
    )
  ).sort();

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < shiftDates.length; i++) {
    const prevDate = new Date(shiftDates[i - 1]);
    const currDate = new Date(shiftDates[i]);
    const diffDays = Math.round(
      (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      currentStreak += 1;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else {
      currentStreak = 1;
    }
  }

  const consecutiveDaysViolated = maxStreak >= maxConsecutiveDays;
  if (consecutiveDaysViolated) {
    reasons.push(
      `Worker scheduled for ${maxStreak} consecutive work days without a mandatory weekly rest day (threshold is ${maxConsecutiveDays} days).`
    );
  }

  return {
    hasFatigueRisk: restHoursViolated || consecutiveDaysViolated,
    restHoursViolated,
    consecutiveDaysViolated,
    lastRestHours,
    consecutiveDaysWorked: maxStreak,
    reasons,
  };
}
