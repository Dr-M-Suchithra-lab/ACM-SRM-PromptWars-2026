import { earnedSoFar, type EarnedSoFar } from "@/core/earned";
import type { ClosedShift } from "@/core/types";
import type { Repos } from "@/server/repos/types";

/** Month-to-date gross for the home-screen counter, from the same engine as the payslip. */
export async function earnedFor(repos: Repos, workerId: string, now: Date): Promise<EarnedSoFar | null> {
  const worker = await repos.workers.getById(workerId);
  const org = worker ? await repos.orgs.getById(worker.orgId) : undefined;
  if (!worker || !org) return null;
  const shifts = (await repos.shifts.getByWorker(workerId)).filter((s): s is ClosedShift => Boolean(s.outAt));
  return earnedSoFar(shifts, worker.pay, org.labourRules, now);
}
