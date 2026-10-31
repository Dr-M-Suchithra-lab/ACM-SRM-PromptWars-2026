import {
  attendanceRuleMet,
  checkEligibility,
  windowStart,
  type AttendanceDay,
  type SchemeEligibility,
} from "@/core/eligibility";
import { minutesByDay } from "@/core/overtime";
import { monthlyWage } from "@/core/pay";
import { getISTDay } from "@/core/time";
import type { ClosedShift, Sector, Shift } from "@/core/types";
import { getScheme, SCHEMES } from "@/config/schemes";
import type { CertificateRequest, Org, Repos, Worker } from "@/server/repos/types";

/** Sector of every site (any employer: days worked elsewhere count towards a scheme too). */
async function siteSectors(repos: Repos): Promise<Map<string, Sector>> {
  return new Map((await repos.sites.getAll()).map((s) => [s.id, s.sector]));
}

/** Every IST day worked, with the sector of the site it was worked at. */
function attendanceDays(shifts: ClosedShift[], sectorOf: Map<string, Sector>): AttendanceDay[] {
  const days: AttendanceDay[] = [];
  for (const shift of shifts) {
    const sector = sectorOf.get(shift.siteId);
    if (sector) for (const day of minutesByDay([shift]).keys()) days.push({ day, sector });
  }
  return days;
}

export interface BenefitsView {
  results: SchemeEligibility[];
  certificates: CertificateRequest[];
}

/** Day-based eligibility for one worker; yes/no conditions are answered on the worker's own device. */
export async function benefitsFor(repos: Repos, workerId: string, now: Date): Promise<BenefitsView | null> {
  const worker = await repos.workers.getById(workerId);
  const org = worker ? await repos.orgs.getById(worker.orgId) : undefined;
  if (!worker || !org) return null;
  const [shifts, certificates, sectorOf] = await Promise.all([
    repos.shifts.getByWorker(workerId),
    repos.certificates.getByWorker(workerId),
    siteSectors(repos),
  ]);
  return { results: eligibilityFrom(worker, org, shifts, sectorOf, now), certificates };
}

/** Scheme eligibility from already-loaded data, so a whole organisation needs one batch of queries. */
function eligibilityFrom(
  worker: Worker,
  org: Org,
  shifts: Shift[],
  sectorOf: Map<string, Sector>,
  now: Date,
): SchemeEligibility[] {
  const closed = shifts.filter((s): s is ClosedShift => Boolean(s.outAt));
  return checkEligibility(
    { sector: org.sector, monthlyWage: monthlyWage(worker.pay, org.labourRules) },
    attendanceDays(closed, sectorOf),
    SCHEMES,
    now,
  );
}

export type CertificateError = "not_eligible" | "already_requested" | "not_found" | "not_pending";

/** The worker asks the employer to certify their days (e.g. the BOCW board's 90-day certificate). */
export async function requestCertificate(
  repos: Repos,
  input: { workerId: string; schemeId: string; now: Date },
): Promise<{ ok: true } | { ok: false; error: CertificateError }> {
  const scheme = getScheme(input.schemeId);
  const view = await benefitsFor(repos, input.workerId, input.now);
  const result = view?.results.find((r) => r.schemeId === input.schemeId);
  if (!scheme?.needsWorkCertificate || !view || !result || !attendanceRuleMet(result))
    return { ok: false, error: "not_eligible" };
  if (view.certificates.some((c) => c.schemeId === input.schemeId && c.status !== "rejected"))
    return { ok: false, error: "already_requested" };

  const worker = (await repos.workers.getById(input.workerId))!;
  const shifts = (await repos.shifts.getByWorker(worker.id)).filter((s): s is ClosedShift => Boolean(s.outAt));
  const from = windowStart(input.now, scheme.rule.windowMonths);
  const days = attendanceDays(shifts, await siteSectors(repos))
    .filter((d) => d.day >= from && (scheme.rule.workType !== "building" || d.sector === "construction"))
    .map((d) => d.day);
  const unique = [...new Set(days)].sort();
  await repos.certificates.create({
    id: `cert-${crypto.randomUUID()}`,
    orgId: worker.orgId,
    workerId: worker.id,
    schemeId: input.schemeId,
    status: "requested",
    daysWorked: unique.length,
    from: unique[0],
    to: unique[unique.length - 1] ?? getISTDay(input.now),
    requestedAt: input.now,
  });
  return { ok: true };
}

export async function decideCertificate(
  repos: Repos,
  input: { id: string; orgId: string; adminId: string; approve: boolean; now: Date },
): Promise<{ ok: true } | { ok: false; error: CertificateError }> {
  const request = await repos.certificates.getById(input.id);
  if (!request || request.orgId !== input.orgId) return { ok: false, error: "not_found" };
  if (request.status !== "requested") return { ok: false, error: "not_pending" };
  await repos.certificates.update(request.id, {
    status: input.approve ? "approved" : "rejected",
    decidedAt: input.now,
    decidedBy: input.adminId,
  });
  return { ok: true };
}

/** A worker counts as "close" from this share of the days needed. */
export const CLOSE_TO_ELIGIBLE_SHARE = 2 / 3;

export interface EligibilityRow {
  worker: Worker;
  schemeId: string;
  progress: { done: number; needed: number };
  request?: CertificateRequest;
}

/** For the admin People page: who has (nearly) met a certificate scheme's days, and their requests. */
export async function certificateCandidates(repos: Repos, orgId: string, now: Date): Promise<EligibilityRow[]> {
  // Two round trips for the whole organisation instead of a chain of queries per worker.
  const [org, workers, requests, sectorOf] = await Promise.all([
    repos.orgs.getById(orgId),
    repos.workers.getByOrg(orgId),
    repos.certificates.getByOrg(orgId),
    siteSectors(repos),
  ]);
  if (!org) return [];
  const shiftsOf = Map.groupBy(await repos.shifts.getByWorkers(workers.map((w) => w.id)), (s) => s.workerId);
  const rows: EligibilityRow[] = [];
  for (const worker of workers) {
    for (const result of eligibilityFrom(worker, org, shiftsOf.get(worker.id) ?? [], sectorOf, now)) {
      if (!getScheme(result.schemeId)?.needsWorkCertificate) continue;
      if (result.progress.done < result.progress.needed * CLOSE_TO_ELIGIBLE_SHARE) continue;
      const request = requests.find((r) => r.workerId === worker.id && r.schemeId === result.schemeId);
      rows.push({ worker, schemeId: result.schemeId, progress: result.progress, request });
    }
  }
  // Pending requests first, then the closest to eligible.
  return rows.sort(
    (a, b) =>
      Number(b.request?.status === "requested") - Number(a.request?.status === "requested") ||
      b.progress.done - a.progress.done,
  );
}
