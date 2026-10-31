// ─── Verified work history for the skill passport ───────────────────
// "Lost career history" is about experience as much as certificates. Every check-in is
// employer-verified evidence of where a worker worked, for how long, and in which role.

import { minutesByDay } from "./overtime";
import type { ClosedShift, Sector } from "./types";

export type HistorySource = "verified_employer" | "self_reported";

export interface WorkHistoryEntry {
  employer: string;
  site: string;
  sector: Sector;
  role: string;
  /** First and last IST day worked, 'YYYY-MM-DD' */
  from: string;
  to: string;
  days: number;
  minutes: number;
  source: HistorySource;
}

export interface SiteInfo {
  name: string;
  employer: string;
  sector: Sector;
}

/** One entry per site, built from closed shifts. Newest first. */
export function buildWorkHistory(
  shifts: ClosedShift[],
  sites: ReadonlyMap<string, SiteInfo>,
  role: string,
): WorkHistoryEntry[] {
  const bySite = new Map<string, ClosedShift[]>();
  for (const shift of shifts) bySite.set(shift.siteId, [...(bySite.get(shift.siteId) ?? []), shift]);

  const entries: WorkHistoryEntry[] = [];
  for (const [siteId, siteShifts] of bySite) {
    const site = sites.get(siteId);
    if (!site) continue;
    const byDay = minutesByDay(siteShifts);
    const days = [...byDay.keys()].sort();
    entries.push({
      employer: site.employer,
      site: site.name,
      sector: site.sector,
      role,
      from: days[0],
      to: days[days.length - 1],
      days: days.length,
      minutes: [...byDay.values()].reduce((a, b) => a + b, 0),
      source: "verified_employer",
    });
  }
  return entries.sort((a, b) => b.to.localeCompare(a.to));
}

/** Totals over verified entries only: self-reported work is shown but never counted. */
export function verifiedTotals(entries: WorkHistoryEntry[]): { days: number; minutes: number } {
  return entries
    .filter((e) => e.source === "verified_employer")
    .reduce((acc, e) => ({ days: acc.days + e.days, minutes: acc.minutes + e.minutes }), { days: 0, minutes: 0 });
}

/** Which sections of the passport a worker chose to share. */
export interface PassportShare {
  skills: boolean;
  history: boolean;
  hours: boolean;
}

export interface PassportSections<S> {
  skills?: S[];
  history?: WorkHistoryEntry[];
  totals?: { days: number; minutes: number };
}

/** Drop everything the worker did not choose to share. Hours are removed from history rows too. */
export function sharedSections<S>(skills: S[], history: WorkHistoryEntry[], share: PassportShare): PassportSections<S> {
  return {
    skills: share.skills ? skills : undefined,
    history: share.history ? history.map((e) => (share.hours ? e : { ...e, minutes: 0 })) : undefined,
    totals: share.hours ? verifiedTotals(history) : undefined,
  };
}
