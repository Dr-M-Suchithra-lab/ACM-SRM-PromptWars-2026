import { describe, expect, it } from "vitest";
import { earnedSoFar } from "@/core/earned";
import { computePayslip } from "@/core/pay";
import { DEFAULT_LABOUR_RULES } from "@/core/overtime";
import { checkEligibility, windowStart, type AttendanceDay } from "@/core/eligibility";
import { SCHEMES, getScheme, type Scheme } from "@/config/schemes";
import { locales } from "@/i18n/locales";
import { addDays, dayShifts, ist } from "../helpers";

const PAY = { basis: "daily", rate: 80_000 } as const;

describe("earnedSoFar", () => {
  const now = new Date("2026-10-30T18:00:00+05:30");

  it("equals the payslip gross for the same month (one engine, one number)", () => {
    const shifts = [...dayShifts("2026-10-01", 20, 9), ist("2026-10-30", "08:00", "17:30")];
    const earned = earnedSoFar(shifts, PAY, DEFAULT_LABOUR_RULES, now);
    expect(earned.monthGross).toBe(computePayslip("w1", "2026-10", shifts, PAY, DEFAULT_LABOUR_RULES).gross);
    expect(earned.month).toBe("2026-10");
  });

  it("separates today's earnings, overtime included", () => {
    const today = ist("2026-10-30", "08:00", "18:00"); // 10h: 8h regular + 2h overtime
    const earned = earnedSoFar([...dayShifts("2026-10-26", 3, 8), today], PAY, DEFAULT_LABOUR_RULES, now);
    expect(earned.todayGross).toBe(8 * 10_000 + 2 * 20_000);
  });

  it("ignores shifts from other months", () => {
    const earned = earnedSoFar(dayShifts("2026-09-20", 5, 8), PAY, DEFAULT_LABOUR_RULES, now);
    expect(earned).toEqual({ month: "2026-10", monthGross: 0, todayGross: 0 });
  });
});

describe("checkEligibility (Benefits Unlocker)", () => {
  const now = new Date("2026-10-30T10:00:00+05:30");
  const bocw = [getScheme("bocw")!];
  const builder = { sector: "construction", monthlyWage: 2_080_000 } as const;
  const days = (count: number, sector: AttendanceDay["sector"] = "construction"): AttendanceDay[] =>
    Array.from({ length: count }, (_, i) => ({ day: addDays("2026-10-29", -i), sector }));

  it.each([
    [89, false, 1],
    [90, true, 0],
    [91, true, 0],
  ])("BOCW at %i days: eligible=%s, %i days remaining", (count, eligible, remaining) => {
    const [result] = checkEligibility(builder, days(count), bocw, now, { age_18_60: true });
    expect(result.eligible).toBe(eligible);
    expect(result.daysRemaining).toBe(remaining);
    expect(result.progress).toEqual({ done: Math.min(count, 90), needed: 90 });
  });

  it("counts the day exactly 12 months ago, but not the day before", () => {
    expect(windowStart(now, 12)).toBe("2025-10-30");
    const at = (day: string) =>
      checkEligibility(builder, [{ day, sector: "construction" }], bocw, now)[0].progress.done;
    expect(at("2025-10-30")).toBe(1);
    expect(at("2025-10-29")).toBe(0);
  });

  it("counts each day once even with two shifts", () => {
    const twice: AttendanceDay[] = [...days(10), ...days(10)];
    expect(checkEligibility(builder, twice, bocw, now)[0].progress.done).toBe(10);
  });

  it("counts only building work for the construction board", () => {
    const [result] = checkEligibility(builder, [...days(60), ...days(60, "hospital")], bocw, now);
    expect(result.progress.done).toBe(60);
  });

  it("shows each sector only the schemes that apply to it", () => {
    const ids = (sector: "construction" | "hospital") =>
      checkEligibility({ sector, monthlyWage: 1_000_000 }, [], SCHEMES, now).map((r) => r.schemeId);
    expect(ids("construction")).toContain("bocw");
    expect(ids("construction")).not.toContain("esic");
    expect(ids("hospital")).toContain("esic");
    expect(ids("hospital")).not.toContain("bocw");
  });

  it("asks for facts it cannot know, and a 'no' answer rules the worker out", () => {
    const [unknown] = checkEligibility(builder, days(95), bocw, now);
    expect(unknown).toMatchObject({ eligible: false, missingConditions: ["age_18_60"], daysRemaining: 0 });
    const [tooOld] = checkEligibility(builder, days(95), bocw, now, { age_18_60: false });
    expect(tooOld).toMatchObject({ eligible: false, failedConditions: ["age_18_60"] });
  });

  it("applies wage ceilings", () => {
    const pension = [getScheme("pmsym")!];
    const answers = { age_18_40: true, not_epf_esic_member: true };
    expect(
      checkEligibility({ sector: "hospital", monthlyWage: 1_400_000 }, days(5), pension, now, answers)[0].eligible,
    ).toBe(true);
    const [high] = checkEligibility({ sector: "hospital", monthlyWage: 1_800_000 }, days(5), pension, now, answers);
    expect(high.failedConditions).toEqual(["max_monthly_wage"]);
  });

  it("has every scheme text in all four languages, and a source", () => {
    const texts = (s: Scheme) => [s.name, s.summary, s.howToApply, ...s.benefits, ...s.documentsNeeded];
    for (const scheme of SCHEMES) {
      expect(scheme.source.length).toBeGreaterThan(10);
      expect(scheme.officialLink).toMatch(/^https:\/\//);
      for (const text of texts(scheme)) for (const locale of locales) expect(text[locale]?.trim()).toBeTruthy();
    }
  });
});
