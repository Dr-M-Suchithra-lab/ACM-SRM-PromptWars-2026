import { describe, expect, it } from "vitest";
import {
  calculatePay,
  restWindow,
  schedulingRisks,
  shiftInput,
  type Policy,
} from "../shared/engines";

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
  ends_at: "2026-10-26T16:00:00+05:30",
  break_minutes: 0,
};

describe("financial and scheduling boundaries", () => {
  it("counts a consecutive-day streak beyond the seven-day overtime window", () => {
    const shifts = Array.from({ length: 9 }, (_, index) => ({
      ...shift,
      id: `day-${index + 1}`,
      worker_id: "A",
      starts_at: `2026-10-${String(index + 1).padStart(2, "0")}T08:00:00+05:30`,
      ends_at: `2026-10-${String(index + 1).padStart(2, "0")}T16:00:00+05:30`,
    }));
    const risks = schedulingRisks(shifts, {
      ...policy,
      max_consecutive_days: 8,
    });
    expect(risks).toContainEqual({
      type: "consecutive_days",
      shiftId: "day-9",
      detail: "9 consecutive scheduled days exceeds configured 8-day limit",
    });
    expect(risks.filter((r) => r.type === "consecutive_days")).toHaveLength(1);
    const withGap = shifts.filter((s) => s.id !== "day-5");
    expect(
      schedulingRisks(withGap, { ...policy, max_consecutive_days: 8 }).some(
        (r) => r.type === "consecutive_days",
      ),
    ).toBe(false);
  });
  it("starts overtime only after the exact threshold", () => {
    expect(calculatePay(shift, policy)).toMatchObject({
      regularMinutes: 480,
      overtimeMinutes: 0,
      expectedPaise: 80000,
    });
    expect(
      calculatePay({ ...shift, ends_at: "2026-10-26T16:01:00+05:30" }, policy),
    ).toMatchObject({
      regularPaise: 80000,
      overtimeMinutes: 1,
      overtimePaise: 250,
      expectedPaise: 80250,
    });
  });
  it("deducts breaks before applying the threshold", () => {
    expect(
      calculatePay(
        { ...shift, ends_at: "2026-10-26T16:30:00+05:30", break_minutes: 30 },
        policy,
      ),
    ).toMatchObject({
      payableMinutes: 480,
      overtimeMinutes: 0,
      expectedPaise: 80000,
    });
  });
  it("treats explicit offsets as instants across a daylight-saving transition", () => {
    expect(
      calculatePay(
        {
          starts_at: "2026-11-01T00:00:00-04:00",
          ends_at: "2026-11-01T08:00:00-05:00",
          break_minutes: 0,
        },
        { ...policy, timezone: "America/New_York" },
      ),
    ).toMatchObject({
      payableMinutes: 540,
      overtimeMinutes: 60,
      expectedPaise: 95000,
    });
  });
  it("accepts exactly 24 hours but rejects a longer shift", () => {
    expect(
      shiftInput.safeParse({ ...shift, ends_at: "2026-10-27T08:00:00+05:30" })
        .success,
    ).toBe(true);
    expect(
      shiftInput.safeParse({ ...shift, ends_at: "2026-10-27T08:01:00+05:30" })
        .success,
    ).toBe(false);
  });
  it.each([NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    "rejects unsafe recorded currency %s",
    (recorded) => {
      expect(() => calculatePay(shift, policy, recorded)).toThrow(
        "Invalid recorded money",
      );
    },
  );
  it("retains the existing no-payroll default and exact-match difference", () => {
    expect(calculatePay(shift, policy)).toMatchObject({
      recordedPaise: 0,
      discrepancyPaise: 80000,
    });
    expect(calculatePay(shift, policy, 80000).discrepancyPaise).toBe(0);
  });
  it("uses the most recent prior end even when shifts overlap", () => {
    const risks = schedulingRisks(
      [
        {
          ...shift,
          id: "long",
          worker_id: "A",
          ends_at: "2026-10-26T20:00:00+05:30",
        },
        {
          ...shift,
          id: "short",
          worker_id: "A",
          starts_at: "2026-10-26T09:00:00+05:30",
          ends_at: "2026-10-26T10:00:00+05:30",
        },
        {
          ...shift,
          id: "next",
          worker_id: "A",
          starts_at: "2026-10-27T06:00:00+05:30",
          ends_at: "2026-10-27T14:00:00+05:30",
        },
      ],
      policy,
    );
    expect(risks).toContainEqual({
      type: "short_rest",
      shiftId: "next",
      minutes: 600,
      requiredMinutes: 660,
      detail: "10h rest; configured minimum 11h",
    });
  });
  it("labels overlap separately and measures the actual shared interval", () => {
    const risks = schedulingRisks(
      [
        {
          ...shift,
          id: "long",
          worker_id: "A",
          ends_at: "2026-10-26T20:00:00+05:30",
        },
        {
          ...shift,
          id: "short",
          worker_id: "A",
          starts_at: "2026-10-26T09:00:00+05:30",
          ends_at: "2026-10-26T10:00:00+05:30",
          break_minutes: 0,
        },
      ],
      policy,
    );
    expect(risks).toContainEqual({
      type: "overlap",
      shiftId: "short",
      minutes: 60,
      requiredMinutes: 660,
      detail:
        "1h overlapping shifts; resolve the conflict before assessing a rest window",
    });
    expect(risks.some((r) => r.type === "short_rest")).toBe(false);
    expect(risks.some((r) => /-\d.*h rest/.test(r.detail))).toBe(false);
  });
  it("does not turn duplicate references to one shift into repeated overtime or overlap", () => {
    const same = { ...shift, id: "same", worker_id: "A" };
    expect(schedulingRisks([same, same, same], policy)).toEqual(
      schedulingRisks([same], policy),
    );
  });
  it.each([NaN, -1, 1.5])("rejects invalid minimum rest %s", (minimum) => {
    expect(() => restWindow(shift.starts_at, shift.ends_at, minimum)).toThrow(
      "Invalid rest interval",
    );
  });
});
