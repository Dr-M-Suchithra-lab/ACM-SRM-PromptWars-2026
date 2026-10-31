import { describe, expect, it } from "vitest";
import { urgencyFromText } from "@/core/hazard-urgency";
import { resolveSeverity } from "@/core/hazard-rules";
import { canMerge } from "@/core/hazard-duplicates";
import { stripNumbers, triageHelp } from "@/core/help-triage";
import { outstandingShortfall, PAY_TOLERANCE_PAISE, type PayCheckResult } from "@/core/pay-check";
import type { Hazard } from "@/core/types";

describe("urgency words", () => {
  it("treats fire, smoke and people trapped as danger now, in all four languages", () => {
    for (const text of [
      "There is a fire near the store",
      "smoke from the panel",
      "आग लगी है",
      "ஒருவர் சிக்கி இருக்கிறார்",
      "పొగ వస్తోంది",
    ]) {
      expect(urgencyFromText(text), text).toBe("critical");
    }
  });

  it("marks injuries as high and says nothing for ordinary reports", () => {
    expect(urgencyFromText("a worker is injured")).toBe("high");
    expect(urgencyFromText("उसे चोट लगी")).toBe("high");
    expect(urgencyFromText("helmets are missing at gate 2")).toBeNull();
    expect(urgencyFromText(undefined, "")).toBeNull();
  });

  it("matches whole words only, and ignores equipment names", () => {
    expect(urgencyFromText("आगे का रास्ता बंद है")).toBeNull(); // "ahead", not "fire"
    expect(urgencyFromText("the fire exit is blocked")).toBeNull();
    expect(urgencyFromText("fire extinguisher missing")).toBeNull();
  });

  it("a fire is never below critical, whatever the hint", () => {
    expect(resolveSeverity("fire", "low")).toBe("critical");
    expect(resolveSeverity("fire")).toBe("critical");
  });
});

describe("manual merge", () => {
  const hazard = (id: string, category: Hazard["category"], extra: Partial<Hazard> = {}): Hazard => ({
    id,
    siteId: "site1",
    orgId: "org1",
    category,
    baseSeverity: "medium",
    severity: "medium",
    status: "received",
    reports: [],
    timeline: [],
    createdAt: new Date(),
    escalationLevel: 0,
    trackingRefs: [],
    ...extra,
  });

  it("only joins the same danger at the same site", () => {
    expect(canMerge(hazard("a", "scaffolding"), hazard("b", "scaffolding"))).toBe(true);
    expect(canMerge(hazard("a", "heat_stress"), hazard("b", "scaffolding"))).toBe(false);
    expect(canMerge(hazard("a", "scaffolding"), hazard("b", "scaffolding", { siteId: "site2" }))).toBe(false);
    expect(canMerge(hazard("a", "scaffolding"), hazard("a", "scaffolding"))).toBe(false);
    expect(canMerge(hazard("a", "scaffolding"), hazard("b", "scaffolding", { status: "fixed" }))).toBe(false);
  });
});

describe("help triage", () => {
  it("puts 112 first for an emergency", () => {
    expect(triageHelp("my friend is unconscious")).toMatchObject({ urgency: "emergency", topic: "emergency" });
    expect(triageHelp("my friend is unconscious").helplines[0]).toBe("emergency");
  });

  it("routes pay, harassment, health and benefits to the right place", () => {
    expect(triageHelp("overtime not paid for 3 weeks")).toMatchObject({
      topic: "pay",
      action: "check_pay",
      helplines: ["eshram"],
    });
    expect(triageHelp("supervisor threatens me")).toMatchObject({
      topic: "harassment",
      urgency: "urgent",
      helplines: ["women", "emergency"],
    });
    expect(triageHelp("बहुत तनाव है")).toMatchObject({ topic: "health", helplines: ["mental_health"] });
    expect(triageHelp("how do I get my PF")).toMatchObject({ topic: "benefits", action: "benefits" });
    expect(triageHelp("something else")).toMatchObject({ topic: "other", urgency: "normal" });
  });

  it("removes phone numbers from model text", () => {
    expect(stripNumbers("Call 1800 123 4567 now")).toBe("Call now");
    expect(stripNumbers("Rest for 2 days")).toBe("Rest for 2 days");
  });
});

describe("paid gap", () => {
  const result = (totalShortfall: number): PayCheckResult => ({ status: "checked", findings: [], totalShortfall });

  it("is gone once arrears cover it, within rounding", () => {
    expect(outstandingShortfall(result(90_700), 0)).toBe(90_700);
    expect(outstandingShortfall(result(90_700), 90_700)).toBe(0);
    expect(outstandingShortfall(result(90_700), 90_700 - PAY_TOLERANCE_PAISE)).toBe(0);
    expect(outstandingShortfall(result(90_700), 50_000)).toBe(40_700);
  });
});
