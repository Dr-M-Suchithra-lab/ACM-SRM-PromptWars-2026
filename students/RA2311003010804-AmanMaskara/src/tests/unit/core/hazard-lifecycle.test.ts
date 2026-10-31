import { describe, expect, it } from "vitest";
import {
  applyHazardAction,
  deadlineState,
  getHazardAge,
  isOverdue,
  nextEscalationLevel,
  sweepHazard,
} from "@/core/hazard-lifecycle";
import { findDuplicateHazard, severityForReports, zoneKey } from "@/core/hazard-duplicates";
import { raiseSeverity } from "@/core/hazard-rules";
import type { Hazard } from "@/core/types";

const HOUR = 3_600_000;
const t0 = new Date("2026-10-30T06:00:00Z");
const at = (hours: number) => new Date(t0.getTime() + hours * HOUR);

function hazard(overrides: Partial<Hazard> = {}): Hazard {
  return {
    id: "h1",
    siteId: "site1",
    orgId: "org1",
    category: "scaffolding",
    baseSeverity: "high",
    severity: "high",
    status: "received",
    reports: [{ reporterId: null, at: t0 }],
    timeline: [{ status: "received", at: t0 }],
    createdAt: t0,
    escalationLevel: 0,
    trackingRefs: [],
    ...overrides,
  };
}

describe("hazard age and deadlines", () => {
  it("measures age from when the report was received", () => {
    expect(getHazardAge(hazard(), at(76))).toBe(76 * HOUR);
  });

  it("is on time exactly at the deadline and overdue one millisecond later (high = 24h)", () => {
    expect(isOverdue(hazard(), at(24))).toBe(false);
    expect(isOverdue(hazard(), new Date(at(24).getTime() + 1))).toBe(true);
  });

  it("uses severity-specific deadlines ('Danger now' = 4h)", () => {
    expect(isOverdue(hazard({ severity: "critical" }), at(4.5))).toBe(true);
    expect(isOverdue(hazard({ severity: "low" }), at(100))).toBe(false);
  });

  it("turns amber at 75% of the deadline and red after it", () => {
    expect(deadlineState(hazard(), at(17))).toBe("on_track");
    expect(deadlineState(hazard(), at(18))).toBe("due_soon");
    expect(deadlineState(hazard(), at(25))).toBe("overdue");
  });

  it("never counts fixed or merged hazards as overdue", () => {
    expect(isOverdue(hazard({ status: "fixed" }), at(500))).toBe(false);
    expect(isOverdue(hazard({ mergedInto: "h0" }), at(500))).toBe(false);
  });
});

describe("escalation", () => {
  it("moves up one role per missed deadline, capped at the top of the chain", () => {
    expect(nextEscalationLevel(hazard(), at(24), 3)).toBeNull();
    expect(nextEscalationLevel(hazard(), at(25), 3)).toBe(1);
    expect(nextEscalationLevel(hazard(), at(49), 3)).toBe(2);
    expect(nextEscalationLevel(hazard(), at(500), 3)).toBe(3);
    expect(nextEscalationLevel(hazard({ escalationLevel: 2 }), at(49), 3)).toBeNull();
  });

  it("writes each escalation to the history", () => {
    const swept = sweepHazard(hazard(), at(30), 3);
    expect(swept?.escalationLevel).toBe(1);
    expect(swept?.timeline.at(-1)).toEqual({ status: "escalated", at: at(30), level: 1 });
    expect(sweepHazard(swept!, at(31), 3)).toBeNull();
  });
});

describe("hazard actions", () => {
  it("rejects a dismiss without a reason", () => {
    expect(applyHazardAction(hazard(), { type: "dismiss", reason: "" }, at(1), "admin1")).toEqual({
      ok: false,
      error: "reason_required",
    });
    expect(applyHazardAction(hazard(), { type: "dismiss", reason: "other" }, at(1), "admin1")).toEqual({
      ok: false,
      error: "note_required",
    });
  });

  it("records the dismiss reason for the worker to see", () => {
    const result = applyHazardAction(hazard(), { type: "dismiss", reason: "duplicate" }, at(1), "admin1");
    expect(result).toMatchObject({ ok: true, hazard: { status: "dismissed", dismissReason: "duplicate" } });
  });

  it("needs a note of what was done to mark it fixed, then asks the reporter", () => {
    expect(applyHazardAction(hazard(), { type: "fix", note: " " }, at(1), "admin1")).toEqual({
      ok: false,
      error: "note_required",
    });
    const fixed = applyHazardAction(hazard(), { type: "fix", note: "Re-tied the scaffold" }, at(2), "admin1");
    expect(fixed).toMatchObject({
      ok: true,
      hazard: { status: "fixed", confirmation: "pending", fixNote: "Re-tied the scaffold" },
    });
  });

  it("reopens on 'No, still a problem' and restarts the timer and escalation", () => {
    const escalated = hazard({ escalationLevel: 2 });
    const fixed = applyHazardAction(escalated, { type: "fix", note: "Done" }, at(60), "admin1");
    if (!fixed.ok) throw new Error("fix failed");
    const reopened = applyHazardAction(fixed.hazard, { type: "confirm", fixed: false }, at(70));
    if (!reopened.ok) throw new Error("reopen failed");
    expect(reopened.hazard).toMatchObject({ status: "received", escalationLevel: 0, confirmation: undefined });
    expect(reopened.hazard.timeline.at(-1)).toMatchObject({ status: "reopened", note: "not_fixed" });
    expect(getHazardAge(reopened.hazard, at(71))).toBe(HOUR);
    expect(isOverdue(reopened.hazard, at(90))).toBe(false);
  });

  it("closes the loop on 'Yes, fixed' and only once", () => {
    const fixed = applyHazardAction(hazard(), { type: "fix", note: "Done" }, at(2), "admin1");
    if (!fixed.ok) throw new Error("fix failed");
    const confirmed = applyHazardAction(fixed.hazard, { type: "confirm", fixed: true }, at(3));
    expect(confirmed).toMatchObject({ ok: true, hazard: { confirmation: "confirmed" } });
    if (!confirmed.ok) return;
    expect(applyHazardAction(confirmed.hazard, { type: "confirm", fixed: false }, at(4))).toEqual({
      ok: false,
      error: "not_awaiting_confirmation",
    });
  });

  it("auto-closes a fix the reporter never answered after 3 days", () => {
    const fixed = applyHazardAction(hazard(), { type: "fix", note: "Done" }, at(2), "admin1");
    if (!fixed.ok) throw new Error("fix failed");
    expect(sweepHazard(fixed.hazard, at(2 + 72), 3)).toBeNull();
    expect(sweepHazard(fixed.hazard, at(2 + 73), 3)?.confirmation).toBe("auto_closed");
  });

  it("refuses moves the workflow does not allow", () => {
    expect(applyHazardAction(hazard({ status: "fixed" }), { type: "start" }, at(1), "a")).toEqual({
      ok: false,
      error: "invalid_transition",
    });
    expect(applyHazardAction(hazard(), { type: "reopen" }, at(1), "a")).toEqual({
      ok: false,
      error: "invalid_transition",
    });
  });
});

describe("findDuplicateHazard", () => {
  const open = hazard({ location: "Floor 3" });
  const report = (hours: number, overrides = {}) => ({
    category: "scaffolding" as const,
    siteId: "site1",
    location: "3rd floor",
    at: at(hours),
    ...overrides,
  });

  it("matches the same category and zone within 48 hours", () => {
    expect(findDuplicateHazard(report(5), [open])?.id).toBe("h1");
  });

  it("matches at exactly 48 hours and not after", () => {
    expect(findDuplicateHazard(report(48), [open])?.id).toBe("h1");
    expect(findDuplicateHazard(report(48.01), [open])).toBeNull();
  });

  it("does not merge a different zone, category or site", () => {
    expect(findDuplicateHazard(report(1, { location: "Floor 5" }), [open])).toBeNull();
    expect(findDuplicateHazard(report(1, { category: "electrical" }), [open])).toBeNull();
    expect(findDuplicateHazard(report(1, { siteId: "site2" }), [open])).toBeNull();
  });

  it("does not merge into a closed hazard", () => {
    expect(findDuplicateHazard(report(1), [hazard({ location: "Floor 3", status: "fixed" })])).toBeNull();
  });

  it("normalises zone names", () => {
    expect(zoneKey("Floor-3")).toBe(zoneKey("third floor"));
    expect(zoneKey(undefined)).toBe("");
  });

  it("raises severity one level from the 3rd report", () => {
    expect(severityForReports("medium", 2)).toBe("medium");
    expect(severityForReports("medium", 3)).toBe("high");
    expect(severityForReports("critical", 9)).toBe("critical");
    expect(raiseSeverity("low")).toBe("medium");
  });
});
