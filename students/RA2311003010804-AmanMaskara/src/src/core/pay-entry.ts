/**
 * The maths behind "Record what was paid": exact minutes, never rounded hours, so a worker who
 * was paid in full always matches FairPay Sentinel's check to the paisa. Pay already recorded is
 * a floor: a record can be added to, never taken back (taking it back would reopen a gap that
 * could then be paid a second time).
 */

/** The hours sliders move in quarter hours between what is already paid and the exact time worked. */
export const SLIDER_STEP_MINUTES = 15;

/**
 * The slider's stops in minutes: what is already paid (`floor`), each quarter hour above it, and
 * exactly `totalMinutes` last. One stop only when nothing is left to pay.
 */
export function sliderMinutes(totalMinutes: number, floor = 0): number[] {
  const top = Math.max(0, totalMinutes);
  const low = Math.min(Math.max(0, floor), top);
  const stops = [low];
  for (let m = (Math.floor(low / SLIDER_STEP_MINUTES) + 1) * SLIDER_STEP_MINUTES; m < top; m += SLIDER_STEP_MINUTES) {
    stops.push(m);
  }
  if (top > low) stops.push(top);
  return stops;
}

/** The stop closest to `minutes` (the last stop when everything is paid). */
export function stopIndex(stops: number[], minutes: number): number {
  let best = 0;
  for (const [index, stop] of stops.entries()) {
    if (Math.abs(stop - minutes) <= Math.abs(stops[best] - minutes)) best = index;
  }
  return best;
}

/** Paise for minutes at an hourly rate, rounded the same way the payslip and the pay check round. */
const payFor = (minutes: number, ratePerHour: number) => Math.round((minutes * ratePerHour) / 60);

export interface PayslipFigures {
  regularMinutes: number;
  overtimeMinutes: number;
  /** Paise per hour */
  rates: { regular: number; overtime: number };
  /** Paise, from the payslip */
  gross: number;
  deductions: number;
}

/**
 * Gross, deductions and net for the minutes that were paid. When every recorded minute was paid
 * the payslip's own figures are used, so "Paid in full" can never come out a few paise short.
 */
export function paidAmounts(
  payslip: PayslipFigures,
  paid: { regularMinutes: number; overtimeMinutes: number },
): { gross: number; deductions: number; net: number } {
  const everything = paid.regularMinutes >= payslip.regularMinutes && paid.overtimeMinutes >= payslip.overtimeMinutes;
  const gross = everything
    ? payslip.gross
    : payFor(paid.regularMinutes, payslip.rates.regular) + payFor(paid.overtimeMinutes, payslip.rates.overtime);
  const deductions = Math.min(payslip.deductions, gross);
  return { gross, deductions, net: gross - deductions };
}

// ── Pay already recorded ──────────────────────────────────────────

/** A month's pay record as the form works with it: minutes and paise. */
export interface RecordedPay {
  regularMinutes: number;
  overtimeMinutes: number;
  gross: number;
  deductions: number;
  net: number;
}

/** A stored record (hours as decimals) in the form's units. */
export const recordedPay = (record: {
  paidRegularHours: number;
  paidOvertimeHours: number;
  grossPaid: number;
  deductions: number;
  netPaid: number;
}): RecordedPay => ({
  regularMinutes: Math.round(record.paidRegularHours * 60),
  overtimeMinutes: Math.round(record.paidOvertimeHours * 60),
  gross: record.grossPaid,
  deductions: record.deductions,
  net: record.netPaid,
});

export type Preset = "full" | "no_overtime" | "custom";

/**
 * Which presets fit what is already paid. "Paid in full" always does. "Overtime not paid" only
 * when there is overtime and none of it is paid yet. "Some hours not paid" while anything is left.
 */
export function presetAllowed(
  preset: Preset,
  worked: { regularMinutes: number; overtimeMinutes: number },
  recorded: RecordedPay | null,
): boolean {
  if (preset === "full") return true;
  const paidOvertime = recorded?.overtimeMinutes ?? 0;
  if (preset === "no_overtime") return worked.overtimeMinutes > 0 && paidOvertime === 0;
  return (recorded?.regularMinutes ?? 0) < worked.regularMinutes || paidOvertime < worked.overtimeMinutes || !recorded;
}

/** The preset that shows what is already recorded (or "Paid in full" when nothing is). */
export function presetFor(
  worked: { regularMinutes: number; overtimeMinutes: number },
  recorded: RecordedPay | null,
): Preset {
  if (!recorded) return "full";
  const regularAll = recorded.regularMinutes >= worked.regularMinutes;
  if (regularAll && recorded.overtimeMinutes >= worked.overtimeMinutes) return "full";
  if (regularAll && recorded.overtimeMinutes === 0) return "no_overtime";
  return "custom";
}

/** True when an entry would pay less than is already recorded, in hours or in money. */
export const belowRecorded = (entry: RecordedPay, recorded: RecordedPay | null): boolean =>
  recorded !== null &&
  (entry.regularMinutes < recorded.regularMinutes ||
    entry.overtimeMinutes < recorded.overtimeMinutes ||
    entry.gross < recorded.gross ||
    entry.net < recorded.net);

/** Rounding allowed on money (₹1, as in the pay check) and on hours given as decimals (1 minute). */
const MONEY_TOLERANCE_PAISE = 100;
const MINUTE_TOLERANCE = 1;

/**
 * True when an entry pays more than the month owes: more take-home pay than the payslip's net,
 * or more hours than were worked. Wages for this month can't exceed what is due for it.
 */
export const aboveDue = (
  entry: Pick<RecordedPay, "regularMinutes" | "overtimeMinutes" | "net">,
  due: { regularMinutes: number; overtimeMinutes: number; net: number },
): boolean =>
  entry.net > due.net + MONEY_TOLERANCE_PAISE ||
  entry.regularMinutes > due.regularMinutes + MINUTE_TOLERANCE ||
  entry.overtimeMinutes > due.overtimeMinutes + MINUTE_TOLERANCE;

/**
 * Why "Record pay" may not change a worker's month, or null when it may:
 * - "checkout": paid, or being paid, through a FairShift checkout (that payment is the record);
 * - "settled": the month is paid in full, or its gap was paid as arrears (changing the record
 *   would count the arrears twice).
 */
export function recordLock(row: {
  hasRecord: boolean;
  outstanding: number;
  arrearsPaid: number;
  checkout: boolean;
}): "checkout" | "settled" | null {
  if (row.checkout) return "checkout";
  if (row.hasRecord && (row.outstanding === 0 || row.arrearsPaid > 0)) return "settled";
  return null;
}
