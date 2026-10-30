import { describe, it, expect } from "vitest";
import { calculatePay, type Policy } from "../shared/engines";
const p: Policy = {
  hourly_paise: 10000,
  regular_minutes: 480,
  overtime_bps: 15000,
  min_rest_minutes: 660,
  max_shift_minutes: 720,
  max_consecutive_days: 6,
  timezone: "Asia/Kolkata",
  basis: "daily",
  daily_paise: 80000,
};
const shift = {
  starts_at: "2026-10-26T08:00:00+05:30",
  ends_at: "2026-10-26T18:30:00+05:30",
  break_minutes: 30,
};
describe("daily pay and historical policy snapshots", () => {
  it("calculates daily base and proportional overtime in paise", () =>
    expect(calculatePay(shift, p, 95000)).toMatchObject({
      regularPaise: 80000,
      overtimePaise: 30000,
      expectedPaise: 110000,
      discrepancyPaise: 15000,
    }));
  it("prorates a half-day under the configured policy", () =>
    expect(
      calculatePay({ ...shift, ends_at: "2026-10-26T12:30:00+05:30" }, p)
        .expectedPaise,
    ).toBe(40000));
  it("keeps confirmed historical rates when current policy changes", () =>
    expect(
      calculatePay(
        { ...shift, policy_snapshot: p },
        { ...p, daily_paise: 160000 },
      ).expectedPaise,
    ).toBe(110000));
  it("applies the current policy to an unsnapshotted shift", () =>
    expect(
      calculatePay(shift, { ...p, daily_paise: 160000 }).expectedPaise,
    ).toBe(220000));
  it("rejects a daily policy without a daily rate", () =>
    expect(() => calculatePay(shift, { ...p, daily_paise: undefined })).toThrow(
      "Daily rate",
    ));
});
