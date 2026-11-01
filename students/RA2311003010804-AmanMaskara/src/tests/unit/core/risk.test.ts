import { describe, expect, it } from "vitest";
import { computeQuitRisk, computeSiteRisk, INDIVIDUAL_WEIGHTS, SITE_WEIGHTS } from "@/core/risk";

const calm = { overtimeMinThisWeek: 0, overtimeMinLastWeek: 0, missedCheckIns: 0, payDisputes: 0 };

describe("computeQuitRisk (individual signals only)", () => {
  it("scores 0 for a rested worker with no missed days or disputes", () => {
    expect(computeQuitRisk(calm).score).toBe(0);
  });

  it("scores 100 when every individual signal is at its maximum", () => {
    expect(
      computeQuitRisk({ overtimeMinThisWeek: 900, overtimeMinLastWeek: 100, missedCheckIns: 9, payDisputes: 4 }).score,
    ).toBe(100);
  });

  it("explains every factor, and weights sum to 100", () => {
    const result = computeQuitRisk({ ...calm, missedCheckIns: 3 });
    expect(result.reasons.map((r) => r.factor)).toEqual(["overtime", "missedDays", "payDisputes"]);
    expect(result.reasons.find((r) => r.factor === "missedDays")?.value).toBe(0.6);
    expect(result.score).toBe(21); // 0.6 × 35
    expect(Object.values(INDIVIDUAL_WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("boosts overtime when the trend is rising", () => {
    const flat = computeQuitRisk({ ...calm, overtimeMinThisWeek: 300, overtimeMinLastWeek: 300 });
    const rising = computeQuitRisk({ ...calm, overtimeMinThisWeek: 300, overtimeMinLastWeek: 60 });
    expect(rising.score).toBeGreaterThan(flat.score);
    expect(rising.reasons[0].detail).toContain("rising");
  });

  it("separates two workers at the same site by their own signals", () => {
    const steady = computeQuitRisk(calm);
    const strained = computeQuitRisk({
      overtimeMinThisWeek: 480,
      overtimeMinLastWeek: 120,
      missedCheckIns: 2,
      payDisputes: 1,
    });
    expect(strained.score - steady.score).toBeGreaterThan(40);
  });
});

describe("computeSiteRisk (shared context, never added to individuals)", () => {
  it("scores mood and open hazards", () => {
    expect(computeSiteRisk({ teamMoodAvg: 3, unresolvedHazards: 0 }).score).toBe(0);
    expect(computeSiteRisk({ teamMoodAvg: 1, unresolvedHazards: 5 }).score).toBe(100);
    expect(Object.values(SITE_WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("clamps out-of-range mood", () => {
    expect(computeSiteRisk({ teamMoodAvg: 0, unresolvedHazards: 0 }).reasons[0].value).toBe(1);
  });
});
