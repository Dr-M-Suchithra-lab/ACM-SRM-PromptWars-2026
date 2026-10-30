import { describe, it, expect } from 'vitest';
import { computeDayPay, shadowPayslip } from '@/core/pay';
import { SectorRules } from '@/config/sectors';

describe('Pay Calculation Core Logic', () => {
  const standardRules: SectorRules = {
    dailyStandardHours: 8,
    overtimeMultiplier: 2.0,
    minRestHoursBetweenShifts: 10,
    maxConsecutiveDays: 6,
    heatWarningThreshold: 38,
  };

  it('computes standard shift pay without overtime', () => {
    const pay = computeDayPay({ totalHours: 8, ratePerHour: 150 }, standardRules);
    expect(pay.standardHours).toBe(8);
    expect(pay.overtimeHours).toBe(0);
    expect(pay.basePayRupees).toBe(1200);
    expect(pay.overtimePayRupees).toBe(0);
    expect(pay.netPayRupees).toBe(1200);
  });

  it('computes overtime pay with statutory 2x multiplier for excess hours', () => {
    const pay = computeDayPay({ totalHours: 10, ratePerHour: 100 }, standardRules);
    expect(pay.standardHours).toBe(8);
    expect(pay.overtimeHours).toBe(2);
    expect(pay.basePayRupees).toBe(800);
    // 2 hours * 100 * 2.0 = 400
    expect(pay.overtimePayRupees).toBe(400);
    expect(pay.netPayRupees).toBe(1200);
  });

  it('applies statutory deductions correctly', () => {
    const pay = computeDayPay({ totalHours: 8, ratePerHour: 100, deductions: 50 }, standardRules);
    expect(pay.netPayRupees).toBe(750);
    expect(pay.deductionsRupees).toBe(50);
  });

  it('handles edge case of 0 hours worked', () => {
    const pay = computeDayPay({ totalHours: 0, ratePerHour: 100 }, standardRules);
    expect(pay.standardHours).toBe(0);
    expect(pay.overtimeHours).toBe(0);
    expect(pay.netPayRupees).toBe(0);
  });

  it('generates shadow payslip detecting underpayment gap', () => {
    const verifiedShifts = [
      { date: '2026-10-01', hoursWorked: 8, expectedPayRupees: 800 },
      { date: '2026-10-02', hoursWorked: 10, expectedPayRupees: 1200 }, // 8h base + 2h OT
      { date: '2026-10-03', hoursWorked: 8, expectedPayRupees: 800 },
    ];
    // Expected: 2800 rupees. Actual paid: 2400 rupees
    const shadow = shadowPayslip(verifiedShifts, 2400);
    expect(shadow.status).toBe('UNDERPAID');
    expect(shadow.totalExpectedRupees).toBe(2800);
    expect(shadow.discrepancyRupees).toBe(400);
    expect(shadow.plainExplanation).toContain('Outstanding unpaid wages: ₹400');
  });

  it('generates shadow payslip when fully settled', () => {
    const verifiedShifts = [
      { date: '2026-10-01', hoursWorked: 8, expectedPayRupees: 800 },
    ];
    const shadow = shadowPayslip(verifiedShifts, 800);
    expect(shadow.status).toBe('SETTLED');
    expect(shadow.discrepancyRupees).toBe(0);
    expect(shadow.plainExplanation).toContain('fully matched');
  });
});
