import { describe, expect, it } from "vitest";
import { checkFatigue } from "@/core/fatigue";
import { construction } from "@/core/sectors/construction";
import { hospital } from "@/core/sectors/hospital";
import type { FatigueRuleConfig } from "@/core/types";
import { addDays, dayShifts, ist } from "../helpers";

const NOW = new Date("2026-10-09T12:00:00+05:30"); // Friday of ISO week 41
const rule = (check: FatigueRuleConfig["check"], threshold: number): FatigueRuleConfig[] => [
  { ruleId: `r-${check}`, check, threshold },
];

describe("checkFatigue", () => {
  it("returns no alerts for a healthy schedule", () => {
    expect(checkFatigue(dayShifts("2026-10-05", 5, 8), construction.fatigueRules, NOW)).toEqual([]);
  });

  it("flags days longer than the daily limit", () => {
    const alerts = checkFatigue(dayShifts("2026-10-05", 1, 11), rule("maxDailyHours", 10), NOW);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      messageKey: "fatigue.maxDailyHours",
      evidence: { day: "2026-10-05", minutes: 660 },
    });
  });

  it("flags rest gaps shorter than 11h", () => {
    const shifts = [ist("2026-10-05", "22:00", "06:00", true), ist("2026-10-06", "16:00", "23:00")];
    const alerts = checkFatigue(shifts, rule("minRestHours", 11), NOW);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].evidence).toMatchObject({ gapHours: 10, threshold: 11 });
  });

  it("flags more than 6 consecutive working days", () => {
    const alerts = checkFatigue(dayShifts("2026-09-28", 7, 8), rule("maxConsecutiveDays", 6), NOW);
    expect(alerts[0].evidence).toMatchObject({ consecutiveDays: 7, lastDay: "2026-10-04" });
  });

  it("does not count a broken streak", () => {
    const shifts = [...dayShifts("2026-09-28", 4, 8), ...dayShifts("2026-10-03", 4, 8)];
    expect(checkFatigue(shifts, rule("maxConsecutiveDays", 6), NOW)).toEqual([]);
  });

  it("flags more than 2 consecutive night shifts (hospital)", () => {
    const nights = [0, 1, 2].map((i) => ist(addDays("2026-10-05", i), "22:00", "06:00", true));
    const alerts = checkFatigue(nights, hospital.fatigueRules, NOW);
    expect(alerts.map((a) => a.ruleId)).toContain("hos-nights-2");
    expect(alerts.find((a) => a.ruleId === "hos-nights-2")?.evidence).toMatchObject({ consecutiveNights: 3 });
  });

  it("ignores non-consecutive nights", () => {
    const nights = [0, 2, 4].map((i) => ist(addDays("2026-10-05", i), "22:00", "06:00", true));
    expect(checkFatigue(nights, rule("maxConsecutiveNights", 2), NOW)).toEqual([]);
  });

  it("flags more than 48h in the current week only", () => {
    const lastWeek = dayShifts("2026-09-28", 6, 9); // 54h, previous week
    const thisWeek = dayShifts("2026-10-05", 5, 10); // 50h, current week
    const alerts = checkFatigue([...lastWeek, ...thisWeek], rule("maxWeeklyHours", 48), NOW);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].evidence).toMatchObject({ weekHours: 50, week: "2026-W41" });
  });

  it("returns no alerts when there are no shifts", () => {
    expect(checkFatigue([], [...construction.fatigueRules, ...hospital.fatigueRules], NOW)).toEqual([]);
  });
});
