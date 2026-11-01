import { describe, expect, it } from "vitest";
import {
  belowRecorded,
  paidAmounts,
  presetAllowed,
  presetFor,
  recordedPay,
  recordLock,
  sliderMinutes,
  stopIndex,
} from "@/core/pay-entry";

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
    const stops = sliderMinutes(total);
    expect(stops).toHaveLength(41); // 0, 39 whole quarters, then the exact 9h 47m
    expect(stops.slice(0, 3)).toEqual([0, 15, 30]);
    expect(stops.at(-2)).toBe(9 * 60 + 45);
    expect(stops.at(-1)).toBe(total);
    expect(stopIndex(stops, total)).toBe(40);
    expect(stopIndex(stops, 9 * 60 + 45)).toBe(39);
    expect(stopIndex(stops, 0)).toBe(0);
    expect(sliderMinutes(0)).toEqual([0]);
  });

  it("start at what is already paid and can't go below it", () => {
    // 9h 8m of overtime already paid, of 9h 47m worked.
    const stops = sliderMinutes(murali.overtimeMinutes, 9 * 60 + 8);
    expect(stops).toEqual([548, 555, 570, 585, 587]);
    expect(stopIndex(stops, 548)).toBe(0);
    expect(stopIndex(stops, 0)).toBe(0); // nothing below the floor
    // Everything already paid: one stop, nothing to move.
    expect(sliderMinutes(600, 600)).toEqual([600]);
    expect(sliderMinutes(600, 700)).toEqual([600]);
  });
});

describe("pay already recorded", () => {
  const worked = { regularMinutes: 200 * 60, overtimeMinutes: 10 * 60 };
  const recorded = (regular: number, overtime: number, net = 10_000_00) => ({
    regularMinutes: regular,
    overtimeMinutes: overtime,
    gross: net + 1_000_00,
    deductions: 1_000_00,
    net,
  });

  it("reads a stored record in minutes", () => {
    expect(
      recordedPay({ paidRegularHours: 213 + 2 / 60, paidOvertimeHours: 9, grossPaid: 5, deductions: 1, netPaid: 4 }),
    ).toEqual({ regularMinutes: 213 * 60 + 2, overtimeMinutes: 540, gross: 5, deductions: 1, net: 4 });
  });

  it("opens on the preset that shows the record", () => {
    expect(presetFor(worked, null)).toBe("full");
    expect(presetFor(worked, recorded(200 * 60, 10 * 60))).toBe("full");
    expect(presetFor(worked, recorded(200 * 60, 0))).toBe("no_overtime");
    expect(presetFor(worked, recorded(200 * 60, 9 * 60))).toBe("custom");
    expect(presetFor(worked, recorded(190 * 60, 10 * 60))).toBe("custom");
  });

  it("offers 'Overtime not paid' only while no overtime is paid", () => {
    expect(presetAllowed("no_overtime", worked, null)).toBe(true);
    expect(presetAllowed("no_overtime", worked, recorded(200 * 60, 0))).toBe(true);
    expect(presetAllowed("no_overtime", worked, recorded(190 * 60, 9 * 60))).toBe(false);
    expect(presetAllowed("no_overtime", { ...worked, overtimeMinutes: 0 }, null)).toBe(false);
  });

  it("offers 'Some hours not paid' while hours are left, and 'Paid in full' always", () => {
    expect(presetAllowed("custom", worked, null)).toBe(true);
    expect(presetAllowed("custom", worked, recorded(190 * 60, 10 * 60))).toBe(true);
    // Every hour paid, only money short (an undeclared deduction): no hours left to choose.
    expect(presetAllowed("custom", worked, recorded(200 * 60, 10 * 60, 9_000_00))).toBe(false);
    expect(presetAllowed("full", worked, recorded(200 * 60, 10 * 60))).toBe(true);
  });

  it("never pays less than is recorded, in hours or money", () => {
    const floor = recorded(190 * 60, 9 * 60);
    expect(belowRecorded(floor, null)).toBe(false);
    expect(belowRecorded(floor, floor)).toBe(false);
    expect(belowRecorded({ ...floor, regularMinutes: 200 * 60, net: floor.net + 1 }, floor)).toBe(false);
    expect(belowRecorded({ ...floor, overtimeMinutes: 0 }, floor)).toBe(true);
    expect(belowRecorded({ ...floor, regularMinutes: 0 }, floor)).toBe(true);
    expect(belowRecorded({ ...floor, net: floor.net - 1 }, floor)).toBe(true);
    expect(belowRecorded({ ...floor, gross: floor.gross - 1 }, floor)).toBe(true);
  });

  it("closes a month paid by checkout, paid in full, or with its gap paid", () => {
    const base = { hasRecord: true, outstanding: 907_00, arrearsPaid: 0, checkout: false };
    expect(recordLock({ ...base, hasRecord: false, outstanding: 0 })).toBeNull();
    expect(recordLock(base)).toBeNull(); // partly paid: can be added to
    expect(recordLock({ ...base, checkout: true })).toBe("checkout");
    expect(recordLock({ ...base, outstanding: 0 })).toBe("settled");
    expect(recordLock({ ...base, arrearsPaid: 500_00 })).toBe("settled");
  });
});
