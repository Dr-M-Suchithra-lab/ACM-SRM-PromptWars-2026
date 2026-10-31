import { computeOvertime, minutesByDay } from "@/core/overtime";
import { checkFatigue } from "@/core/fatigue";
import { computeQuitRisk, computeSiteRisk } from "@/core/risk";
import { getISTDay, getISTWeekBucket } from "@/core/time";
import { getSectorProfile } from "@/core/sectors";
import { gateByCohort } from "@/core/anonymity";
import type { ClosedShift, FatigueAlert, QuitRiskResult } from "@/core/types";
import type { FeedbackEntry, Hazard, Org, Repos, Worker } from "@/server/repos/types";
import { isActiveDispute } from "@/server/services/disputes";
import { sweepHazards } from "@/server/services/hazards";
import { isOpen } from "@/core/hazard-lifecycle";

const DAY_MS = 24 * 60 * 60 * 1000;
const LOOKBACK_DAYS = 14;

export interface WorkerHealth {
  worker: Worker;
  onSite: boolean;
  weekMinutes: number;
  overtimeThisWeek: number;
  fatigue: FatigueAlert[];
  risk: QuitRiskResult;
  missedDays: number;
}

export interface SiteContext {
  siteId: string;
  risk: QuitRiskResult;
}

export interface OrgSnapshot {
  org: Org;
  workers: WorkerHealth[];
  /** Shared site conditions, shown next to (never added to) individual quit-risk */
  sites: SiteContext[];
  hazards: Hazard[];
  feedback: FeedbackEntry[];
  attendanceByDay: { day: string; present: number }[];
  overtimeByWeek: { week: string; hours: number }[];
  moodAverage: number | null;
}

/** Workers checked in right now (an open shift), out of everyone on the organisation's roll. */
export async function onDutyCount(repos: Repos, orgId: string): Promise<{ onDuty: number; total: number }> {
  const workers = await repos.workers.getByOrg(orgId);
  const open = new Set((await repos.shifts.getOpenByWorkers(workers.map((w) => w.id))).map((s) => s.workerId));
  return { onDuty: workers.filter((w) => open.has(w.id)).length, total: workers.length };
}

/** IST calendar days from `count - 1` days ago through today, oldest first. */
export function recentDays(now: Date, count: number): string[] {
  return Array.from({ length: count }, (_, i) => getISTDay(new Date(now.getTime() - (count - 1 - i) * DAY_MS)));
}

/**
 * Missed working days in the window (today excluded). Rosters differ by sector (construction
 * rests on Sunday, hospitals rotate), so each 7-day block allows one rest day on any day.
 */
export function countMissedDays(shifts: ClosedShift[], now: Date, joinedAt: Date, days = LOOKBACK_DAYS): number {
  const worked = new Set(shifts.flatMap((s) => [getISTDay(s.inAt), getISTDay(s.outAt)]));
  const joined = getISTDay(joinedAt);
  const window = recentDays(now, days + 1).slice(0, -1);
  let missed = 0;
  for (let end = window.length; end > 0; end -= 7) {
    const block = window.slice(Math.max(0, end - 7), end).filter((day) => day >= joined);
    const expected = block.length - Math.ceil(block.length / 7);
    missed += Math.max(0, expected - block.filter((day) => worked.has(day)).length);
  }
  return missed;
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

/** Everything the admin dashboard needs for one organisation, computed by the pure core. */
export async function buildOrgSnapshot(repos: Repos, orgId: string, now: Date): Promise<OrgSnapshot | null> {
  const org = await repos.orgs.getById(orgId);
  if (!org) return null;
  const profile = getSectorProfile(org.sector);
  const [workers, hazards, feedback, disputes, sites] = await Promise.all([
    repos.workers.getByOrg(orgId),
    sweepHazards(repos, orgId, now),
    repos.feedback.getByOrg(orgId),
    repos.payDisputes.getByOrg(orgId),
    repos.sites.getByOrg(orgId),
  ]);
  const activeDisputes = new Map<string, number>();
  for (const d of disputes.filter(isActiveDispute))
    activeDisputes.set(d.workerId, (activeDisputes.get(d.workerId) ?? 0) + 1);

  const thisWeek = getISTWeekBucket(now);
  const lastWeek = getISTWeekBucket(new Date(now.getTime() - 7 * DAY_MS));
  const openHazardsBySite = new Map<string, number>();
  for (const h of hazards) {
    if (isOpen(h)) {
      openHazardsBySite.set(h.siteId, (openHazardsBySite.get(h.siteId) ?? 0) + 1);
    }
  }

  // Team mood only counts cohorts that pass the k-anonymity gate.
  const moodBySite = new Map<string, number>();
  for (const [, gate] of gateByCohort(feedback, (f) => `${f.siteId}|${f.weekBucket}`)) {
    if (!gate.visible) continue;
    const siteId = gate.items[0].siteId;
    const avg = average(gate.items.flatMap((f) => [f.scores.pay, f.scores.safety, f.scores.respect]));
    if (avg !== null) moodBySite.set(siteId, Math.min(moodBySite.get(siteId) ?? 3, avg));
  }

  const allShifts: ClosedShift[] = [];
  const health: WorkerHealth[] = [];
  const shiftsByWorker = new Map<string, Awaited<ReturnType<Repos["shifts"]["getByWorkers"]>>>();
  for (const s of await repos.shifts.getByWorkers(workers.map((w) => w.id))) {
    shiftsByWorker.set(s.workerId, [...(shiftsByWorker.get(s.workerId) ?? []), s]);
  }
  for (const worker of workers) {
    const shifts = shiftsByWorker.get(worker.id) ?? [];
    const closed = shifts.filter((s): s is ClosedShift => Boolean(s.outAt));
    allShifts.push(...closed);
    const recent = closed.filter((s) => now.getTime() - s.inAt.getTime() <= LOOKBACK_DAYS * DAY_MS);
    const inWeek = (week: string) => closed.filter((s) => getISTWeekBucket(s.inAt) === week);
    const overtimeThisWeek = computeOvertime(inWeek(thisWeek), org.labourRules).overtimeMin;
    const missedDays = countMissedDays(recent, now, worker.joinedAt);

    health.push({
      worker,
      onSite: shifts.some((s) => !s.outAt),
      weekMinutes: [...minutesByDay(inWeek(thisWeek)).values()].reduce((a, b) => a + b, 0),
      overtimeThisWeek,
      fatigue: checkFatigue(recent, profile.fatigueRules, now),
      missedDays,
      risk: computeQuitRisk({
        overtimeMinThisWeek: overtimeThisWeek,
        overtimeMinLastWeek: computeOvertime(inWeek(lastWeek), org.labourRules).overtimeMin,
        missedCheckIns: missedDays,
        payDisputes: activeDisputes.get(worker.id) ?? 0,
      }),
    });
  }

  const days = recentDays(now, LOOKBACK_DAYS);
  const presentByDay = new Map<string, Set<string>>(days.map((d) => [d, new Set()]));
  for (const s of allShifts) presentByDay.get(getISTDay(s.inAt))?.add(s.workerId);
  for (const h of health) if (h.onSite) presentByDay.get(days[days.length - 1])?.add(h.worker.id);

  const weeks = [3, 2, 1, 0].map((n) => getISTWeekBucket(new Date(now.getTime() - n * 7 * DAY_MS)));
  const overtimeByWeek = weeks.map((week) => {
    let minutes = 0;
    for (const worker of workers) {
      minutes += computeOvertime(
        allShifts.filter((s) => s.workerId === worker.id && getISTWeekBucket(s.inAt) === week),
        org.labourRules,
      ).overtimeMin;
    }
    return { week, hours: Math.round((minutes / 60) * 10) / 10 };
  });

  const visibleScores = [...gateByCohort(feedback, (f) => `${f.siteId}|${f.weekBucket}`).values()]
    .flatMap((g) => (g.visible ? g.items : []))
    .flatMap((f) => [f.scores.pay, f.scores.safety, f.scores.respect]);

  return {
    org,
    workers: health.sort((a, b) => b.risk.score - a.risk.score),
    sites: sites.map((site) => ({
      siteId: site.id,
      risk: computeSiteRisk({
        teamMoodAvg: moodBySite.get(site.id) ?? 2,
        unresolvedHazards: openHazardsBySite.get(site.id) ?? 0,
      }),
    })),
    hazards: hazards.filter((h) => !h.mergedInto),
    feedback,
    attendanceByDay: days.map((day) => ({ day, present: presentByDay.get(day)?.size ?? 0 })),
    overtimeByWeek,
    moodAverage: average(visibleScores),
  };
}

/** Short IST date label, e.g. "27 Oct". */
export function shortDay(day: string): string {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );
}
