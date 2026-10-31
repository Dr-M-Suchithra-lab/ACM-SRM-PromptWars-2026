import { beforeEach, describe, expect, it } from "vitest";
import { getRepos } from "@/server/repos";
import { resetMemoryStore } from "@/server/repos/memory";
import { payCheckFor } from "@/server/services/pay-check";
import { buildPayroll } from "@/server/services/payroll";
import { benefitsFor, certificateCandidates } from "@/server/services/benefits";
import { monthKey } from "@/core/period";

beforeEach(() => resetMemoryStore());

// The admin pages load a whole organisation in one batch of queries; these pin that the batched
// path gives exactly the per-worker answers a worker sees on their own phone.
describe("organisation-wide batching", () => {
  const now = new Date();

  it.each(["org1", "org2"])("payroll rows equal each worker's own pay check (%s)", async (orgId) => {
    const repos = getRepos();
    for (const month of [monthKey(now), monthKey(now, -1)]) {
      const rows = await buildPayroll(repos, orgId, month);
      expect(rows.length).toBe((await repos.workers.getByOrg(orgId)).length);
      for (const row of rows) {
        const own = (await payCheckFor(repos, row.workerId, month))!;
        expect(row).toMatchObject({
          gross: own.view.payslip.gross,
          net: own.view.payslip.net,
          daysWorked: own.view.daysWorked,
          check: own.result,
          outstanding: own.outstanding,
          rates: own.rates,
        });
      }
    }
  });

  // Only the construction org has a scheme that needs a work certificate (the BOCW board).
  it("certificate progress equals each worker's own benefits view", async () => {
    const repos = getRepos();
    const rows = await certificateCandidates(repos, "org1", now);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const own = (await benefitsFor(repos, row.worker.id, now))!;
      expect(own.results.find((r) => r.schemeId === row.schemeId)?.progress).toEqual(row.progress);
    }
  });

  it("returns nothing for an unknown organisation", async () => {
    expect(await buildPayroll(getRepos(), "nope", monthKey(now))).toEqual([]);
    expect(await certificateCandidates(getRepos(), "nope", now)).toEqual([]);
  });
});
