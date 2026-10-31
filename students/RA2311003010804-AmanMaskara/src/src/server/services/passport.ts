import { buildWorkHistory, type SiteInfo, type WorkHistoryEntry } from "@/core/work-history";
import type { ClosedShift } from "@/core/types";
import type { Org, Repos, Skill, Worker } from "@/server/repos/types";

export interface PassportData {
  worker: Worker;
  org: Org;
  skills: Skill[];
  /** Verified entries from check-ins first, then the worker's own self-reported past work */
  history: WorkHistoryEntry[];
}

export async function passportData(repos: Repos, workerId: string): Promise<PassportData | null> {
  const worker = await repos.workers.getById(workerId);
  const org = worker ? await repos.orgs.getById(worker.orgId) : undefined;
  if (!worker || !org) return null;
  const [skills, shifts, sites, orgs] = await Promise.all([
    repos.skills.getByWorker(workerId),
    repos.shifts.getByWorker(workerId),
    repos.sites.getAll(),
    repos.orgs.getAll(),
  ]);
  const orgName = new Map(orgs.map((o) => [o.id, o.name]));
  const siteInfo = new Map<string, SiteInfo>(
    sites.map((s) => [s.id, { name: s.name, employer: orgName.get(s.orgId) ?? "", sector: s.sector }]),
  );
  const verified = buildWorkHistory(
    shifts.filter((s): s is ClosedShift => Boolean(s.outAt)),
    siteInfo,
    worker.jobTitle,
  );
  const selfReported: WorkHistoryEntry[] = (worker.pastWork ?? []).map((w) => ({
    employer: w.employer,
    site: "",
    sector: w.sector,
    role: w.role,
    from: w.from,
    to: w.to,
    days: 0,
    minutes: 0,
    source: "self_reported",
  }));
  return { worker, org, skills, history: [...verified, ...selfReported] };
}
