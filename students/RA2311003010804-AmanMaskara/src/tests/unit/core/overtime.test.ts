import { describe, expect, it } from "vitest";
import { computeOvertime, DEFAULT_LABOUR_RULES, minutesByDay } from "@/core/overtime";
import { dayShifts, ist } from "../helpers";

describe("computeOvertime", () => {
  it("has no overtime for a normal week", () => {
    const result = computeOvertime(dayShifts("2026-10-05", 5, 8));
    expect(result).toMatchObject({ regularMin: 2400, overtimeMin: 0, basis: "none" });
  });

  it("uses daily overtime when long days beat the weekly limit", () => {
    // 3 × 11h days = 33h total: weekly OT 0, daily OT 3 × 3h = 9h
    const result = computeOvertime(dayShifts("2026-10-05", 3, 11));
    expect(result.overtimeMin).toBe(540);
    expect(result.regularMin).toBe(33 * 60 - 540);
    expect(result.basis).toBe("daily");
  });

  it("uses weekly overtime when many normal days exceed 48h", () => {
    // 7 × 8h = 56h: daily OT 0, weekly OT 8h
    const result = computeOvertime(dayShifts("2026-10-05", 7, 8));
    expect(result.overtimeMin).toBe(480);
    expect(result.basis).toBe("weekly");
  });

  it("evaluates each week separately (no 48h cap across a month)", () => {
    // Two weeks of 6 × 9h = 54h each. Per week: daily OT 6h, weekly OT 6h → 6h each.
    const shifts = [...dayShifts("2026-10-05", 6, 9), ...dayShifts("2026-10-12", 6, 9)];
    const result = computeOvertime(shifts);
    expect(result.weeks).toHaveLength(2);
    expect(result.overtimeMin).toBe(720);
  });

  it("reports mixed basis when weeks disagree", () => {
    const shifts = [...dayShifts("2026-10-05", 3, 11), ...dayShifts("2026-10-12", 7, 8)];
    const result = computeOvertime(shifts);
    expect(result.basis).toBe("mixed");
    expect(result.weeks.map((w) => w.basis)).toEqual(["daily", "weekly"]);
  });

  it("splits night shifts by IST day before applying the daily limit", () => {
    // 22:00–10:00 = 12h but only 2h + 10h by day → 2h daily OT
    const result = computeOvertime([ist("2026-10-05", "22:00", "10:00", true)]);
    expect(result.overtimeMin).toBe(120);
  });

  it("respects custom labour rules", () => {
    const result = computeOvertime(dayShifts("2026-10-05", 1, 10), { ...DEFAULT_LABOUR_RULES, dailyHrs: 9 });
    expect(result.overtimeMin).toBe(60);
  });

  it("sums minutes per day", () => {
    const byDay = minutesByDay([ist("2026-10-05", "08:00", "12:00"), ist("2026-10-05", "13:00", "17:00")]);
    expect(byDay.get("2026-10-05")).toBe(480);
  });
});
