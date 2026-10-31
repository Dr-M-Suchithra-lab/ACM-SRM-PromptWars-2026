import { describe, expect, it } from "vitest";
import { getSeedData } from "@/server/seed/data";
import { sweepHazard } from "@/core/hazard-lifecycle";
import { ESCALATION_CHAINS } from "@/config/hazard-sla";

// The demo is re-seeded daily relative to "now"; judges must see exactly the story the docs tell.
describe("demo hazards", () => {
  const now = new Date();
  const seed = getSeedData(now);
  const sectorOf = new Map(seed.orgs.map((o) => [o.id, o.sector]));
  const hazard = (id: string) => seed.hazards.find((h) => h.id === id)!;

  it("are already where the app's own deadline and escalation rules put them", () => {
    for (const h of seed.hazards) {
      const chain = ESCALATION_CHAINS[sectorOf.get(h.orgId)!];
      expect(sweepHazard(h, now, chain.length), h.id).toBeNull();
    }
  });

  it("include an anonymous machine report with a photo that the manager has started on", () => {
    const machine = hazard("haz-c7");
    expect(machine).toMatchObject({ category: "machinery", status: "in_progress", assigneeUid: "admin1" });
    expect(machine.reports[0]).toMatchObject({ reporterId: null, photoDataUrl: "/demo/hazard-machine.jpg" });
  });

  it("include Ramesh's electrical danger: fixed once, reopened by him, then escalated twice", () => {
    const electrical = hazard("haz-c8");
    expect(electrical).toMatchObject({ severity: "critical", status: "received", escalationLevel: 2 });
    expect(electrical.reports[0]).toMatchObject({ reporterId: "w1001", photoDataUrl: "/demo/hazard-electrical.jpg" });
    expect(electrical.timeline.map((e) => e.status)).toEqual([
      "received",
      "in_progress",
      "fixed",
      "reopened",
      "escalated",
      "escalated",
    ]);
  });
});
