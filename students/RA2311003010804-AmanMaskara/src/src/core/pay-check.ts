// ─── FairPay Sentinel: recorded hours vs what was actually paid ─────
// FairShift's payslip comes from its own attendance records, so it can never disagree
// with itself. This module compares it with a second source, the employer's own payment
// record, and lists every possible shortfall with the arithmetic behind it.
// Amounts are integer paise; hours from the employer are decimals and rounded to minutes.

/** What the employer says it paid for one worker and one month. */
export interface PaidRecord {
  paidRegularHours: number;
  paidOvertimeHours: number;
  /** Paise */
  grossPaid: number;
  /** Paise, as declared on the employer's sheet */
  deductions: number;
  /** Paise actually handed over */
  netPaid: number;
}

export type FindingCode = "OVERTIME_UNDERPAID" | "REGULAR_UNDERPAID" | "BELOW_MINIMUM_WAGE" | "DEDUCTION_MISMATCH";

export interface PayFinding {
  code: FindingCode;
  /** Paise the worker should have received for this item */
  expected: number;
  /** Paise the employer's record shows */
  paid: number;
  /** expected − paid, in paise (always positive: only shortfalls are reported) */
  difference: number;
  /** The numbers behind the arithmetic, so the UI can show it in plain words */
  explanation: Record<string, number>;
}

export interface PayCheckInput {
  attendance: { regularMinutes: number; overtimeMinutes: number };
  payRules: { hourlyRate: number; overtimeRate: number; expectedDeductions: number };
  paidRecord: PaidRecord | null;
  minimumWage: { dailyRate: number; dailyHours: number };
}

export interface PayCheckResult {
  status: "no_record" | "checked";
  findings: PayFinding[];
  /** Largest defensible shortfall in paise (see totalShortfall) */
  totalShortfall: number;
}

/** Differences of ₹1 or less are rounding, not underpayment. */
export const PAY_TOLERANCE_PAISE = 100;

/** Overtime is owed at twice the ordinary rate, including when testing against the minimum wage. */
export const MIN_WAGE_OVERTIME_FACTOR = 2;

const toMinutes = (hours: number): number => Math.round(hours * 60);
const payFor = (minutes: number, hourlyRate: number): number => Math.round((minutes * hourlyRate) / 60);

function hoursFinding(
  code: "OVERTIME_UNDERPAID" | "REGULAR_UNDERPAID",
  recordedMinutes: number,
  paidMinutes: number,
  rate: number,
): PayFinding | null {
  const missingMinutes = recordedMinutes - paidMinutes;
  if (missingMinutes <= 0) return null;
  const expected = payFor(recordedMinutes, rate);
  const paid = payFor(paidMinutes, rate);
  const difference = expected - paid;
  if (difference <= PAY_TOLERANCE_PAISE) return null;
  return { code, expected, paid, difference, explanation: { recordedMinutes, paidMinutes, missingMinutes, rate } };
}

function minimumWageFinding(input: PayCheckInput, record: PaidRecord): PayFinding | null {
  const { regularMinutes, overtimeMinutes } = input.attendance;
  const minimumHourly = Math.round(input.minimumWage.dailyRate / input.minimumWage.dailyHours);
  const expected =
    payFor(regularMinutes, minimumHourly) + payFor(overtimeMinutes, minimumHourly * MIN_WAGE_OVERTIME_FACTOR);
  const difference = expected - record.grossPaid;
  if (difference <= PAY_TOLERANCE_PAISE) return null;
  return {
    code: "BELOW_MINIMUM_WAGE",
    expected,
    paid: record.grossPaid,
    difference,
    explanation: {
      workedMinutes: regularMinutes + overtimeMinutes,
      minimumHourly,
      minimumDaily: input.minimumWage.dailyRate,
    },
  };
}

/** Money actually withheld is gross − net, whatever the sheet calls it. */
function deductionFinding(input: PayCheckInput, record: PaidRecord): PayFinding | null {
  const withheld = record.grossPaid - record.netPaid;
  const expected = input.payRules.expectedDeductions;
  const difference = withheld - expected;
  if (difference <= PAY_TOLERANCE_PAISE) return null;
  return {
    code: "DEDUCTION_MISMATCH",
    expected,
    paid: withheld,
    difference,
    explanation: { declaredDeductions: record.deductions, withheld, expectedDeductions: expected },
  };
}

/**
 * The total is the sum of the item-level shortfalls (overtime, regular hours, deductions).
 * A minimum-wage breach usually overlaps with those items, so it is never added on top:
 * the total is whichever of the two views is larger.
 */
function totalShortfall(findings: PayFinding[]): number {
  const itemised = findings.filter((f) => f.code !== "BELOW_MINIMUM_WAGE").reduce((sum, f) => sum + f.difference, 0);
  const minimum = findings.find((f) => f.code === "BELOW_MINIMUM_WAGE")?.difference ?? 0;
  return Math.max(itemised, minimum);
}

/** Compare attendance-based pay with the employer's payment record. Pure and deterministic. */
export function checkPay(input: PayCheckInput): PayCheckResult {
  const record = input.paidRecord;
  if (!record) return { status: "no_record", findings: [], totalShortfall: 0 };

  const findings = [
    hoursFinding(
      "OVERTIME_UNDERPAID",
      input.attendance.overtimeMinutes,
      toMinutes(record.paidOvertimeHours),
      input.payRules.overtimeRate,
    ),
    hoursFinding(
      "REGULAR_UNDERPAID",
      input.attendance.regularMinutes,
      toMinutes(record.paidRegularHours),
      input.payRules.hourlyRate,
    ),
    minimumWageFinding(input, record),
    deductionFinding(input, record),
  ].filter((f): f is PayFinding => f !== null);

  return { status: "checked", findings, totalShortfall: totalShortfall(findings) };
}

/**
 * What is still owed once the employer has paid arrears on top of its record. A gap paid
 * in full (to within rounding) is zero, so it disappears from the worker's screen.
 */
export function outstandingShortfall(result: PayCheckResult, arrearsPaid: number): number {
  const left = result.totalShortfall - arrearsPaid;
  return left > PAY_TOLERANCE_PAISE ? left : 0;
}
