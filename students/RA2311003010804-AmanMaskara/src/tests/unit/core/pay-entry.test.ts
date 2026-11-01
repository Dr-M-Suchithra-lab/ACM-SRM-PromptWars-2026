import { describe, expect, it } from "vitest";
import { minutesAtStop, paidAmounts, sliderStops, stopFor } from "@/core/pay-entry";

// Murali: ₹790/day for 8h → ₹98.75/h, ₹197.50/h overtime; 213h 2m regular and 9h 47m overtime.
const murali = {
  regularMinutes: 213 * 60 + 2,
  overtimeMinutes: 9 * 60 + 47,
  rates: { regular: 9_875, overtime: 19_750 },
  gross: Math.round(((213 * 60 + 2) * 9_875) / 60) + Math.round(((9 * 60 + 47) * 19_750) / 60),
  deductions: 2_524_64,
};

describe("recording what was paid", () => {
  it("paid in full is exactly the payslip, whatever the odd minutes", () => {
    const full = paidAmounts(murali, {
      regularMinutes: murali.regularMinutes,
      overtimeMinutes: murali.overtimeMinutes,
    });
    expect(full).toEqual({ gross: murali.gross, deductions: murali.deductions, net: murali.gross - murali.deductions });
  });

  it("charges only the hours left unpaid, rounded like the payslip", () => {
    const noOvertime = paidAmounts(murali, { regularMinutes: murali.regularMinutes, overtimeMinutes: 0 });
    expect(noOvertime.gross).toBe(Math.round((murali.regularMinutes * 9_875) / 60));
    expect(noOvertime.net).toBe(noOvertime.gross - murali.deductions);
  });

  it("never deducts more than was paid", () => {
    expect(paidAmounts(murali, { regularMinutes: 60, overtimeMinutes: 0 })).toEqual({
      gross: 9_875,
      deductions: 9_875,
      net: 0,
    });
  });
});

describe("hours sliders", () => {
  it("move in quarter hours and stop exactly at the time worked", () => {
    const total = murali.overtimeMinutes; // 9h 47m
    expect(sliderStops(total)).toBe(40); // 39 whole quarters + the last 2 minutes
    expect(minutesAtStop(39, total)).toBe(9 * 60 + 45);
    expect(minutesAtStop(40, total)).toBe(total);
    expect(minutesAtStop(99, total)).toBe(total);
    expect(minutesAtStop(-3, total)).toBe(0);
  });

  it("find the stop for a number of minutes, with everything paid on the last stop", () => {
    const total = murali.overtimeMinutes;
    expect(stopFor(total, total)).toBe(40);
    expect(stopFor(9 * 60 + 45, total)).toBe(39);
    expect(stopFor(0, total)).toBe(0);
    expect(sliderStops(0)).toBe(0);
    expect(stopFor(0, 0)).toBe(0);
  });
});
