import { beforeEach, describe, expect, it } from "vitest";
import { getRepos } from "@/server/repos";
import { resetMemoryStore } from "@/server/repos/memory";
import { verifySecret } from "@/server/password";
import { computeOvertime } from "@/core/overtime";
import { checkFatigue } from "@/core/fatigue";
import { getSectorProfile } from "@/core/sectors";
import { K_ANONYMITY } from "@/core/anonymity";
import type { ClosedShift } from "@/core/types";

const closed = (shifts: Awaited<ReturnType<ReturnType<typeof getRepos>["shifts"]["getByWorker"]>>) =>
  shifts.filter((s): s is ClosedShift => Boolean(s.outAt));

describe("seeded demo data (in-memory repos)", () => {
  beforeEach(() => resetMemoryStore());

  it("has two orgs in two sectors with 18 workers each", async () => {
    const repos = getRepos();
    const orgs = await repos.orgs.getAll();
    expect(orgs.map((o) => o.sector)).toEqual(["construction", "hospital"]);
    for (const org of orgs) expect(await repos.workers.getByOrg(org.id)).toHaveLength(18);
    expect(await repos.sites.getByOrg("org2")).toHaveLength(2);
  });

  it("lets the demo personas log in with their documented PINs", async () => {
    const repos = getRepos();
    const ramesh = await repos.workers.getByCode("1001");
    expect(ramesh?.name).toBe("Ramesh Kumar");
    expect(await verifySecret("1234", ramesh!.pinHash, ramesh!.pinSalt)).toBe(true);
    const priya = await repos.admins.getByEmail("priya@buildright.demo");
    expect(await verifySecret("demo1234", priya!.passwordHash, priya!.passwordSalt)).toBe(true);
  });

  it("gives Ramesh overtime to show on his payslip", async () => {
    const shifts = closed(await getRepos().shifts.getByWorker("w1001"));
    expect(computeOvertime(shifts).overtimeMin).toBeGreaterThan(0);
  });

  it("gives Sunita hospital fatigue alerts (nights + short rest)", async () => {
    const shifts = closed(await getRepos().shifts.getByWorker("w2001"));
    const now = new Date();
    const ids = checkFatigue(shifts, getSectorProfile("hospital").fatigueRules, now).map((a) => a.ruleId);
    expect(ids).toContain("hos-nights-2");
    expect(ids).toContain("hos-rest-11h");
  });

  it("stores feedback without worker identity, in cohorts of at least k", async () => {
    const feedback = await getRepos().feedback.getAll();
    for (const entry of feedback) expect(entry).not.toHaveProperty("workerId");
    const sizes = new Map<string, number>();
    for (const f of feedback)
      sizes.set(`${f.cohort}|${f.weekBucket}`, (sizes.get(`${f.cohort}|${f.weekBucket}`) ?? 0) + 1);
    expect(Math.max(...sizes.values())).toBeGreaterThanOrEqual(K_ANONYMITY);
  });

  it("creates and updates records", async () => {
    const repos = getRepos();
    await repos.shifts.create({ id: "t1", workerId: "w1001", siteId: "site1", inAt: new Date(), method: "qr" });
    await repos.shifts.update("t1", { outAt: new Date() });
    expect((await repos.shifts.getBySite("site1")).find((s) => s.id === "t1")?.outAt).toBeInstanceOf(Date);
    const hazard = (await repos.hazards.getByOrg("org1"))[0];
    await repos.hazards.update(hazard.id, { status: "fixed" });
    expect((await repos.hazards.getById(hazard.id))?.status).toBe("fixed");
  });
});
