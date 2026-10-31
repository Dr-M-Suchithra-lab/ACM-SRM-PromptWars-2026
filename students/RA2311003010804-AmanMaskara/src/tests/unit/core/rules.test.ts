import { describe, expect, it } from "vitest";
import { resolveSeverity } from "@/core/hazard-rules";
import { cohortKey, feedbackWeek, gateByCohort, kAnonymityGate, K_ANONYMITY } from "@/core/anonymity";
import { getSectorProfile, SECTOR_PROFILES } from "@/core/sectors";

describe("resolveSeverity", () => {
  it("never lets life-threatening categories fall below high", () => {
    expect(resolveSeverity("fall_from_height", "low")).toBe("high");
    expect(resolveSeverity("electrical")).toBe("high");
    expect(resolveSeverity("needle_stick", "medium")).toBe("high");
  });

  it("lets the AI hint raise severity", () => {
    expect(resolveSeverity("electrical", "critical")).toBe("critical");
    expect(resolveSeverity("slip", "medium")).toBe("medium");
  });

  it("defaults uncategorised floors to low", () => {
    expect(resolveSeverity("noise")).toBe("low");
    expect(resolveSeverity("scaffolding", "low")).toBe("medium");
  });
});

describe("k-anonymity", () => {
  it("hides groups smaller than 5", () => {
    expect(kAnonymityGate([1, 2, 3])).toEqual({ visible: false, count: 3, needed: K_ANONYMITY });
  });

  it("shows groups at the threshold", () => {
    expect(kAnonymityGate([1, 2, 3, 4, 5])).toMatchObject({ visible: true, count: 5 });
  });

  it("gates each cohort independently", () => {
    const items = [...Array(5).fill({ c: "a" }), ...Array(2).fill({ c: "b" })];
    const gated = gateByCohort(items, (i) => i.c);
    expect(gated.get("a")?.visible).toBe(true);
    expect(gated.get("b")?.visible).toBe(false);
  });

  it("normalises cohort keys and buckets by IST week", () => {
    expect(cohortKey("site1", " Masons ")).toBe("site1:masons");
    expect(feedbackWeek(new Date("2026-10-05T10:00:00+05:30"))).toBe("2026-W41");
  });
});

describe("sector profiles", () => {
  it("defines all four sectors with their own hazards and rules", () => {
    expect(Object.keys(SECTOR_PROFILES)).toEqual(["construction", "hospital", "campus", "factory"]);
    expect(getSectorProfile("hospital").hazardCategories).toContain("needle_stick");
    expect(getSectorProfile("construction").defaultPayBasis).toBe("daily");
    for (const profile of Object.values(SECTOR_PROFILES)) {
      expect(profile.fatigueRules.length).toBeGreaterThan(0);
      expect(profile.labourRules.otMultiplier).toBe(2);
    }
  });
});
