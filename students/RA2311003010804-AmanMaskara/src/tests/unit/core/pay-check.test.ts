import { describe, expect, it } from "vitest";
import { checkPay, PAY_TOLERANCE_PAISE, type PaidRecord, type PayCheckInput } from "@/core/pay-check";

// Ramesh: ₹800/day for 8h → ₹100/h regular, ₹200/h overtime. PF 12% of regular pay.
const HOURLY = 10_000;
const OT_RATE = 20_000;

function input(
  paid: Partial<PaidRecord> | null,
  attendance = { regularMinutes: 160 * 60, overtimeMinutes: 13 * 60 + 32 },
): PayCheckInput {
  const regularPay = (attendance.regularMinutes * HOURLY) / 60;
  const otPay = Math.round((attendance.overtimeMinutes * OT_RATE) / 60);
  const pf = Math.round(regularPay * 0.12);
  const matching: PaidRecord = {
    paidRegularHours: attendance.regularMinutes / 60,
    paidOvertimeHours: attendance.overtimeMinutes / 60,
    grossPaid: regularPay + otPay,
    deductions: pf,
    netPaid: regularPay + otPay - pf,
  };
  return {
    attendance,
    payRules: { hourlyRate: HOURLY, overtimeRate: OT_RATE, expectedDeductions: pf },
    paidRecord: paid === null ? null : { ...matching, ...paid },
    minimumWage: { dailyRate: 52_500, dailyHours: 8 },
  };
}

describe("checkPay (FairPay Sentinel)", () => {
  it("finds no shortfall when the employer paid exactly what was recorded", () => {
    const result = checkPay(input({}));
    expect(result).toEqual({ status: "checked", findings: [], totalShortfall: 0 });
  });

  it("reports nothing to compare when there is no paid record", () => {
    expect(checkPay(input(null))).toEqual({ status: "no_record", findings: [], totalShortfall: 0 });
  });

  it("flags underpaid overtime with the arithmetic: 13h 32m recorded, 9h paid → 4h 32m × ₹200", () => {
    const result = checkPay(input({ paidOvertimeHours: 9 }));
    const finding = result.findings.find((f) => f.code === "OVERTIME_UNDERPAID");
    expect(finding).toBeDefined();
    expect(finding!.explanation).toEqual({
      recordedMinutes: 812,
      paidMinutes: 540,
      missingMinutes: 272,
      rate: OT_RATE,
    });
    expect(finding!.difference).toBe(90_667); // ₹906.67 ≈ ₹907
    expect(finding!.expected - finding!.paid).toBe(finding!.difference);
    expect(result.totalShortfall).toBe(90_667);
  });

  it("flags underpaid regular hours", () => {
    const result = checkPay(input({ paidRegularHours: 152 }));
    const finding = result.findings.find((f) => f.code === "REGULAR_UNDERPAID");
    expect(finding?.explanation.missingMinutes).toBe(8 * 60);
    expect(finding?.difference).toBe(80_000); // 8h × ₹100
  });

  it("flags pay below the minimum wage for the hours worked", () => {
    // 20 days × 8h at ₹40/h is far below the ₹525/day minimum.
    const result = checkPay(input({ grossPaid: 20 * 8 * 4_000, netPaid: 20 * 8 * 4_000 - 19_200 }));
    const finding = result.findings.find((f) => f.code === "BELOW_MINIMUM_WAGE");
    expect(finding).toBeDefined();
    expect(finding!.explanation.minimumHourly).toBe(6_563); // ₹525 ÷ 8h, rounded
    expect(finding!.paid).toBe(20 * 8 * 4_000);
  });

  it("flags money withheld beyond the expected deductions, even if the sheet hides it", () => {
    const base = input({});
    const record = base.paidRecord!;
    const result = checkPay({ ...base, paidRecord: { ...record, netPaid: record.netPaid - 50_000 } });
    const finding = result.findings.find((f) => f.code === "DEDUCTION_MISMATCH");
    expect(finding?.difference).toBe(50_000);
    expect(finding?.explanation.declaredDeductions).toBe(record.deductions);
  });

  it("treats differences up to ₹1 as rounding, and ₹1.01 as a finding", () => {
    const base = input({});
    const record = base.paidRecord!;
    const atTolerance = checkPay({ ...base, paidRecord: { ...record, netPaid: record.netPaid - PAY_TOLERANCE_PAISE } });
    expect(atTolerance.findings).toEqual([]);
    const justOver = checkPay({
      ...base,
      paidRecord: { ...record, netPaid: record.netPaid - PAY_TOLERANCE_PAISE - 1 },
    });
    expect(justOver.findings.map((f) => f.code)).toEqual(["DEDUCTION_MISMATCH"]);
  });

  it("ignores half-paise rounding on hours paid as decimals", () => {
    const result = checkPay(input({ paidOvertimeHours: 13.53 })); // 811.8 min → 812 min
    expect(result.findings).toEqual([]);
  });

  it("never double-counts a minimum-wage breach on top of the itemised shortfall", () => {
    const result = checkPay(
      input({ paidOvertimeHours: 0, paidRegularHours: 80, grossPaid: 800_000, netPaid: 800_000 - 192_000 }),
    );
    const itemised = result.findings
      .filter((f) => f.code !== "BELOW_MINIMUM_WAGE")
      .reduce((s, f) => s + f.difference, 0);
    const minimum = result.findings.find((f) => f.code === "BELOW_MINIMUM_WAGE")?.difference ?? 0;
    expect(result.totalShortfall).toBe(Math.max(itemised, minimum));
  });
});
