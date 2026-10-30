import { SectorRules } from '../config/sectors';

export interface ShiftInput {
  totalHours: number;
  ratePerHour: number;
  deductions?: number; // e.g. canteen, advance, PF
}

export interface DayPayBreakdown {
  standardHours: number;
  overtimeHours: number;
  basePayRupees: number;
  overtimePayRupees: number;
  deductionsRupees: number;
  netPayRupees: number;
}

/**
 * Computes day pay with overtime multiplier based on sector rules.
 */
export function computeDayPay(shift: ShiftInput, rules: SectorRules): DayPayBreakdown {
  const hours = Math.max(0, shift.totalHours);
  const rate = Math.max(0, shift.ratePerHour);
  const deductions = Math.max(0, shift.deductions || 0);

  const standardHours = Math.min(hours, rules.dailyStandardHours);
  const overtimeHours = Math.max(0, hours - rules.dailyStandardHours);

  const basePayRupees = Math.round(standardHours * rate);
  const overtimePayRupees = Math.round(overtimeHours * rate * rules.overtimeMultiplier);
  const netPayRupees = Math.max(0, basePayRupees + overtimePayRupees - deductions);

  return {
    standardHours: Number(standardHours.toFixed(2)),
    overtimeHours: Number(overtimeHours.toFixed(2)),
    basePayRupees,
    overtimePayRupees,
    deductionsRupees: deductions,
    netPayRupees,
  };
}

export interface VerifiedShiftSummary {
  date: string;
  hoursWorked: number;
  expectedPayRupees: number;
}

export interface ShadowPayslip {
  totalHoursWorked: number;
  totalExpectedRupees: number;
  totalActualPaidRupees: number;
  discrepancyRupees: number; // expected - actual
  status: 'SETTLED' | 'UNDERPAID' | 'OVERPAID';
  plainExplanation: string;
  shiftCount: number;
}

/**
 * Compares worker's tamper-evident verified shifts against contractor actual payout.
 */
export function shadowPayslip(
  verifiedShifts: VerifiedShiftSummary[],
  totalActualPaidRupees: number
): ShadowPayslip {
  const totalHoursWorked = verifiedShifts.reduce((acc, s) => acc + s.hoursWorked, 0);
  const totalExpectedRupees = verifiedShifts.reduce((acc, s) => acc + s.expectedPayRupees, 0);
  const discrepancyRupees = Math.round(totalExpectedRupees - totalActualPaidRupees);

  let status: 'SETTLED' | 'UNDERPAID' | 'OVERPAID' = 'SETTLED';
  let plainExplanation = '';

  if (discrepancyRupees > 0) {
    status = 'UNDERPAID';
    plainExplanation = `You worked for ${totalHoursWorked} hours worth ₹${totalExpectedRupees}, but received ₹${totalActualPaidRupees}. Outstanding unpaid wages: ₹${discrepancyRupees}.`;
  } else if (discrepancyRupees < 0) {
    status = 'OVERPAID';
    plainExplanation = `Received ₹${Math.abs(discrepancyRupees)} more than shift records show. Check if this includes an incentive or advance bonus.`;
  } else {
    status = 'SETTLED';
    plainExplanation = `All ${verifiedShifts.length} verified shifts fully matched the payment of ₹${totalActualPaidRupees}.`;
  }

  return {
    totalHoursWorked: Number(totalHoursWorked.toFixed(2)),
    totalExpectedRupees,
    totalActualPaidRupees,
    discrepancyRupees,
    status,
    plainExplanation,
    shiftCount: verifiedShifts.length,
  };
}
