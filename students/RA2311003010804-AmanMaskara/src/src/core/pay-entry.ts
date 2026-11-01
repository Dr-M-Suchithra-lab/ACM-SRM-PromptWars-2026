/**
 * The maths behind "Record what was paid": exact minutes, never rounded hours, so a worker who
 * was paid in full always matches FairPay Sentinel's check to the paisa.
 */

/** The hours sliders move in quarter hours, but their last stop is always the exact time worked. */
export const SLIDER_STEP_MINUTES = 15;

/** Number of slider stops above zero: whole quarters, plus one more for any minutes left over. */
export const sliderStops = (totalMinutes: number) => Math.ceil(Math.max(0, totalMinutes) / SLIDER_STEP_MINUTES);

/** Minutes at a slider stop: quarters, and exactly `totalMinutes` at the last stop. */
export const minutesAtStop = (stop: number, totalMinutes: number) =>
  Math.min(Math.max(0, Math.round(stop)) * SLIDER_STEP_MINUTES, Math.max(0, totalMinutes));

/** The slider stop for a number of minutes (the last stop when everything is paid). */
export const stopFor = (minutes: number, totalMinutes: number) =>
  minutes >= totalMinutes ? sliderStops(totalMinutes) : Math.round(Math.max(0, minutes) / SLIDER_STEP_MINUTES);

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
