import { describe, it, expect } from "vitest";
import {
  calculatePay,
  restWindow,
  schedulingRisks,
  shiftInput,
  policyInput,
  type Policy,
} from "../shared/engines";
import { safetyInput, trackingInput, resolveInput } from "../shared/contracts";
const policy: Policy = {
  hourly_paise: 10000,
  regular_minutes: 480,
  overtime_bps: 15000,
  min_rest_minutes: 660,
  max_shift_minutes: 720,
  max_consecutive_days: 6,
  timezone: "Asia/Kolkata",
};
const shift = {
  starts_at: "2026-10-26T08:00:00+05:30",
  ends_at: "2026-10-26T18:30:00+05:30",
  break_minutes: 30,
};
describe("FairPay deterministic integer calculations", () => {
  it("calculates the challenge ₹1100 / ₹950 / ₹150 scenario", () =>
    expect(calculatePay(shift, policy, 95000)).toEqual({
      payableMinutes: 600,
      regularMinutes: 480,
      overtimeMinutes: 120,
      regularPaise: 80000,
      overtimePaise: 30000,
      expectedPaise: 110000,
      recordedPaise: 95000,
      discrepancyPaise: 15000,
    }));
  it("pays regular time without overtime", () =>
    expect(
      calculatePay({ ...shift, ends_at: "2026-10-26T16:30:00+05:30" }, policy)
        .expectedPaise,
    ).toBe(80000));
  it("handles overnight dates and explicit offset", () =>
    expect(
      calculatePay(
        {
          ...shift,
          starts_at: "2026-10-26T19:00:00+05:30",
          ends_at: "2026-10-27T07:00:00+05:30",
          break_minutes: 60,
        },
        policy,
      ).payableMinutes,
    ).toBe(660));
  it("rounds component earnings to integer paise", () =>
    expect(
      calculatePay(
        { ...shift, ends_at: "2026-10-26T08:01:00+05:30", break_minutes: 0 },
        { ...policy, hourly_paise: 10001 },
      ).expectedPaise,
    ).toBe(167));
  it("allows a daily configuration via an eight-hour equivalent hourly policy", () =>
    expect(
      calculatePay({ ...shift, ends_at: "2026-10-26T16:30:00+05:30" }, policy)
        .regularPaise,
    ).toBe(80000));
  it("rejects a same-date overnight end", () =>
    expect(() =>
      calculatePay({ ...shift, ends_at: "2026-10-26T07:00:00+05:30" }, policy),
    ).toThrow());
  it("rejects a break consuming the entire shift", () =>
    expect(shiftInput.safeParse({ ...shift, break_minutes: 630 }).success).toBe(
      false,
    ));
  it("rejects timezone-free timestamps", () =>
    expect(
      shiftInput.safeParse({ ...shift, starts_at: "2026-10-26T08:00:00" })
        .success,
    ).toBe(false));
  it("rejects sub-minute shift boundaries", () =>
    expect(
      shiftInput.safeParse({ ...shift, starts_at: "2026-10-26T08:00:01+05:30" })
        .success,
    ).toBe(false));
  it("rejects shifted seconds even when elapsed time is a whole minute", () =>
    expect(
      shiftInput.safeParse({
        ...shift,
        starts_at: "2026-10-26T08:00:01+05:30",
        ends_at: "2026-10-26T18:30:01+05:30",
      }).success,
    ).toBe(false));
  it("rejects fractional or negative money", () => {
    expect(() => calculatePay(shift, policy, 0.5)).toThrow();
    expect(() => calculatePay(shift, policy, -1)).toThrow();
  });
  it("reports overpayment as a negative difference", () =>
    expect(calculatePay(shift, policy, 120000).discrepancyPaise).toBe(-10000));
  it("rejects an invalid timezone or policy", () => {
    expect(
      policyInput.safeParse({ ...policy, timezone: "Invalid/Zone" }).success,
    ).toBe(false);
    expect(policyInput.safeParse({ ...policy, overtime_bps: 1 }).success).toBe(
      false,
    );
  });
});
describe("RestGuard", () => {
  it("finds six hours between overnight end and next shift", () =>
    expect(
      restWindow("2026-10-27T07:00:00+05:30", "2026-10-27T13:00:00+05:30", 660),
    ).toMatchObject({ minutes: 360, warning: true, shortfallMinutes: 300 }));
  it("clears warning at 18:00, exactly eleven hours", () =>
    expect(
      restWindow("2026-10-27T07:00:00+05:30", "2026-10-27T18:00:00+05:30", 660)
        .warning,
    ).toBe(false));
  it("detects overlapping shifts", () =>
    expect(
      restWindow("2026-10-27T07:00:00+05:30", "2026-10-27T06:00:00+05:30", 660)
        .overlapping,
    ).toBe(true));
  it("does not compare different workers", () =>
    expect(
      schedulingRisks(
        [
          { ...shift, worker_id: "A" },
          {
            ...shift,
            worker_id: "B",
            starts_at: "2026-10-26T19:00:00+05:30",
            ends_at: "2026-10-26T23:00:00+05:30",
            break_minutes: 0,
          },
        ],
        policy,
      ),
    ).toEqual([]));
  it("detects long shifts", () =>
    expect(
      schedulingRisks([shift], { ...policy, max_shift_minutes: 600 }).some(
        (r) => r.type === "long_shift",
      ),
    ).toBe(true));
  it("detects repeated overtime and consecutive days", () => {
    const s = [24, 25, 26].map((day) => ({
      ...shift,
      starts_at: `2026-10-${day}T08:00:00+05:30`,
      ends_at: `2026-10-${day}T18:30:00+05:30`,
    }));
    const risks = schedulingRisks(s, { ...policy, max_consecutive_days: 2 });
    expect(risks.some((r) => r.type === "repeated_overtime")).toBe(true);
    expect(risks.some((r) => r.type === "consecutive_days")).toBe(true);
  });
});
describe("request validation", () => {
  it("rejects employee IDs on anonymous submissions", () =>
    expect(
      safetyInput.safeParse({
        organization_id: "10000000-0000-4000-8000-000000000001",
        category: "equipment",
        priority: "normal",
        description: "A guardrail is loose on level two.",
        employee_id: "leak",
      }).success,
    ).toBe(false));
  it("requires strong tracking credential formats", () =>
    expect(
      trackingInput.safeParse({ reference: "FS-short", token: "guess" })
        .success,
    ).toBe(false));
  it("rejects fractional correction money", () =>
    expect(
      resolveInput.safeParse({
        dispute_id: "40000000-0000-4000-8000-000000000001",
        corrected_paise: 10.5,
        explanation: "An explanation of correction",
      }).success,
    ).toBe(false));
});
