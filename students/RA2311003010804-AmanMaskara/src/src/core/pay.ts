// ─── FairShift Pay Computation ──────────────────────────────────────
// All amounts are integer paise (1 INR = 100 paise). Every division is
// rounded with Math.round so no floating-point value reaches a payslip.

import { ClosedShift, LabourRules, PayConfig, Payslip, PayslipLine } from "./types";
import { computeOvertime } from "./overtime";

/** Working days per month used to derive an hourly rate from a monthly salary. */
export const WORKING_DAYS_PER_MONTH = 26;

/**
 * Derive the hourly rate in paise.
 * - hourly:  as given.
 * - daily:   dailyWage / dailyHrs            (₹800/day ÷ 8h = ₹100/h)
 * - monthly: salary / (dailyHrs × 26 days)   (₹20,800 ÷ 208h = ₹100/h)
 */
export function deriveHourlyRate(pay: PayConfig, rules: LabourRules): number {
  switch (pay.basis) {
    case "hourly":
      return pay.rate;
    case "daily":
      return Math.round(pay.rate / rules.dailyHrs);
    case "monthly":
      return Math.round(pay.rate / (rules.dailyHrs * WORKING_DAYS_PER_MONTH));
  }
}

/** Full-time monthly wage in paise (26 standard days), used for wage-ceiling rules. */
export function monthlyWage(pay: PayConfig, rules: LabourRules): number {
  return pay.basis === "monthly" ? pay.rate : deriveHourlyRate(pay, rules) * rules.dailyHrs * WORKING_DAYS_PER_MONTH;
}

export interface Deduction {
  label: string;
  amount: number;
}

/**
 * Compute a payslip for the closed shifts of one pay period.
 * Regular minutes are paid at the hourly rate, overtime minutes at
 * hourlyRate × otMultiplier.
 */
export function computePayslip(
  workerId: string,
  period: string,
  shifts: ClosedShift[],
  pay: PayConfig,
  rules: LabourRules,
  deductions: Deduction[] = [],
): Payslip {
  const ot = computeOvertime(shifts, rules);
  const hourlyRate = deriveHourlyRate(pay, rules);
  const otRate = Math.round(hourlyRate * rules.otMultiplier);

  const regularPay = Math.round((ot.regularMin * hourlyRate) / 60);
  const otPay = Math.round((ot.overtimeMin * otRate) / 60);

  const lines: PayslipLine[] = [
    { kind: "regular", label: "regular", minutes: ot.regularMin, rate: hourlyRate, amount: regularPay },
  ];
  if (ot.overtimeMin > 0) {
    lines.push({ kind: "overtime", label: "overtime", minutes: ot.overtimeMin, rate: otRate, amount: otPay });
  }

  const deductionLines: PayslipLine[] = deductions.map((d) => ({
    kind: "deduction",
    label: d.label,
    amount: d.amount,
  }));
  const gross = regularPay + otPay;
  const totalDeductions = deductionLines.reduce((sum, d) => sum + d.amount, 0);

  return {
    workerId,
    period,
    lines,
    gross,
    deductions: deductionLines,
    net: gross - totalDeductions,
    overtimeBasis: ot.basis,
  };
}
