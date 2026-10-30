import { z } from "zod";

export const shiftInput = z
  .object({
    starts_at: z.string().datetime({ offset: true }),
    ends_at: z.string().datetime({ offset: true }),
    break_minutes: z.number().int().min(0).max(1440),
  })
  .refine(
    (s) => Date.parse(s.ends_at) > Date.parse(s.starts_at),
    "End must be after start, including the correct date for overnight shifts",
  )
  .refine(
    (s) => (Date.parse(s.ends_at) - Date.parse(s.starts_at)) / 60000 <= 1440,
    "A shift cannot exceed 24 hours",
  )
  .refine(
    (s) =>
      s.break_minutes <
      (Date.parse(s.ends_at) - Date.parse(s.starts_at)) / 60000,
    "Break must be shorter than the shift",
  )
  .refine(
    (s) =>
      Date.parse(s.starts_at) % 60000 === 0 &&
      Date.parse(s.ends_at) % 60000 === 0,
    "Use whole minute shift boundaries",
  );
export const policyInput = z.object({
  basis: z.enum(["hourly", "daily"]).optional(),
  daily_paise: z.number().int().positive().max(100000000).optional(),
  hourly_paise: z.number().int().positive().max(10000000),
  regular_minutes: z.number().int().min(1).max(1440),
  overtime_bps: z.number().int().min(10000).max(50000),
  min_rest_minutes: z.number().int().min(0).max(2880),
  max_shift_minutes: z.number().int().min(60).max(1440),
  max_consecutive_days: z.number().int().min(1).max(30),
  timezone: z.string().refine((v) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: v });
      return true;
    } catch {
      return false;
    }
  }, "Invalid IANA time zone"),
});
export type Policy = z.infer<typeof policyInput>;
export type Shift = z.infer<typeof shiftInput> & {
  id?: string;
  worker_id?: string;
  location?: string;
  confirmed?: boolean;
  policy_snapshot?: Policy | null;
};
export function calculatePay(
  rawShift: Shift,
  rawPolicy: Policy,
  recordedPaise = 0,
) {
  const s = shiftInput.parse(rawShift),
    p = policyInput.parse(rawShift.policy_snapshot ?? rawPolicy);
  if (!Number.isSafeInteger(recordedPaise) || recordedPaise < 0)
    throw new Error("Invalid recorded money");
  const payableMinutes =
    (Date.parse(s.ends_at) - Date.parse(s.starts_at)) / 60000 - s.break_minutes;
  const regularMinutes = Math.min(payableMinutes, p.regular_minutes),
    overtimeMinutes = Math.max(0, payableMinutes - p.regular_minutes);
  // Round each earning component once to the nearest paise using integer ratios.
  if (p.basis === "daily" && !p.daily_paise)
    throw new Error("Daily rate is required");
  const rate = BigInt(p.basis === "daily" ? p.daily_paise! : p.hourly_paise);
  const denominator = BigInt(p.basis === "daily" ? p.regular_minutes : 60);
  const regularPaise = Number(
    (BigInt(regularMinutes) * rate + denominator / 2n) / denominator,
  );
  const overtimePaise = Number(
    (BigInt(overtimeMinutes) * rate * BigInt(p.overtime_bps) +
      denominator * 5000n) /
      (denominator * 10000n),
  );
  return {
    payableMinutes,
    regularMinutes,
    overtimeMinutes,
    regularPaise,
    overtimePaise,
    expectedPaise: regularPaise + overtimePaise,
    recordedPaise,
    discrepancyPaise: regularPaise + overtimePaise - recordedPaise,
  };
}
export function restWindow(
  previousEnd: string,
  nextStart: string,
  minimumMinutes: number,
) {
  const minutes = (Date.parse(nextStart) - Date.parse(previousEnd)) / 60000;
  if (
    !Number.isFinite(minutes) ||
    !Number.isInteger(minimumMinutes) ||
    minimumMinutes < 0
  )
    throw new Error("Invalid rest interval");
  return {
    minutes,
    requiredMinutes: minimumMinutes,
    warning: minutes < minimumMinutes,
    overlapping: minutes < 0,
    shortfallMinutes: Math.max(0, minimumMinutes - minutes),
  };
}
export function schedulingRisks(shifts: Shift[], policy: Policy) {
  policyInput.parse(policy);
  const ordered = [...shifts].sort(
    (a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at),
  );
  const risks: { type: string; shiftId?: string; detail: string }[] = [];
  const day = (s: Shift) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: policy.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(s.starts_at));
  for (let i = 0; i < ordered.length; i++) {
    const s = ordered[i];
    shiftInput.parse(s);
    const duration = (Date.parse(s.ends_at) - Date.parse(s.starts_at)) / 60000;
    if (duration > policy.max_shift_minutes)
      risks.push({
        type: "long_shift",
        shiftId: s.id,
        detail: `${duration / 60}h shift exceeds configured ${policy.max_shift_minutes / 60}h limit`,
      });
    // Never compare different workers.
    const workerShifts = ordered
      .slice(0, i + 1)
      .filter((p) => p.worker_id === s.worker_id);
    const prior = workerShifts
      .slice(0, -1)
      .sort((a, b) => Date.parse(b.ends_at) - Date.parse(a.ends_at))[0];
    if (prior) {
      const r = restWindow(prior.ends_at, s.starts_at, policy.min_rest_minutes);
      if (r.warning)
        risks.push({
          type: "short_rest",
          shiftId: s.id,
          detail: `${r.minutes / 60}h rest; configured minimum ${r.requiredMinutes / 60}h`,
        });
    }
    const window = workerShifts.filter(
      (p) => Date.parse(s.starts_at) - Date.parse(p.starts_at) < 7 * 86400000,
    );
    if (
      window.filter((p) => calculatePay(p, policy).overtimeMinutes > 0)
        .length >= 3
    )
      risks.push({
        type: "repeated_overtime",
        shiftId: s.id,
        detail: "At least three overtime shifts within seven days",
      });
    // Consecutive-day policies permit up to 30 days; only overtime uses seven days.
    const days = [...new Set(workerShifts.map(day))].sort();
    let streak = 1;
    for (let j = days.length - 1; j > 0; j--) {
      if (Date.parse(days[j]) - Date.parse(days[j - 1]) === 86400000) streak++;
      else break;
    }
    if (streak > policy.max_consecutive_days)
      risks.push({
        type: "consecutive_days",
        shiftId: s.id,
        detail: `${streak} consecutive scheduled days exceeds configured ${policy.max_consecutive_days}-day limit`,
      });
  }
  return risks;
}
export const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: paise % 100 ? 2 : 0,
  }).format(paise / 100);
