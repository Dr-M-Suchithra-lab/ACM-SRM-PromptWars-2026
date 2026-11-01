// ─── Duplicate hazard reports ───────────────────────────────────────
// Five workers reporting the same broken scaffold should be one urgent card, not five.
// A new report joins an open hazard of the same category at the same site and zone
// received within the last 48 hours. Reporters never see who else reported.

import { DUPLICATE_WINDOW_MS, REPORTS_FOR_SEVERITY_BUMP } from "@/config/hazard-sla";
import { isOpen } from "./hazard-lifecycle";
import { raiseSeverity } from "./hazard-rules";
import type { Hazard, HazardCategory, HazardSeverity } from "./types";

export interface NewReport {
  category: HazardCategory;
  siteId: string;
  location?: string;
  at: Date;
}

const ORDINALS: Record<string, string> = { first: "1", second: "2", third: "3", fourth: "4", fifth: "5", ground: "0" };

/**
 * Normalised zone: lower-case words with ordinals unified, sorted, so "Floor 3", "3rd floor"
 * and "floor-3" match. An empty zone means "site-wide".
 */
export function zoneKey(location: string | undefined): string {
  const words = (location ?? "").toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];
  return words
    .map((w) => ORDINALS[w] ?? w.replace(/^(\d+)(st|nd|rd|th)$/, "$1"))
    .sort()
    .join(" ");
}

/** The open hazard a new report duplicates, or null. The newest match wins. */
export function findDuplicateHazard(report: NewReport, openReports: Hazard[]): Hazard | null {
  const zone = zoneKey(report.location);
  const matches = openReports.filter(
    (h) =>
      isOpen(h) &&
      h.category === report.category &&
      h.siteId === report.siteId &&
      zoneKey(h.location) === zone &&
      report.at.getTime() - h.createdAt.getTime() <= DUPLICATE_WINDOW_MS &&
      report.at.getTime() >= h.createdAt.getTime(),
  );
  return matches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
}

/** Many independent reports mean the danger is real and widely felt: raise urgency one level. */
export function severityForReports(base: HazardSeverity, reportCount: number): HazardSeverity {
  return reportCount >= REPORTS_FOR_SEVERITY_BUMP ? raiseSeverity(base) : base;
}

/**
 * Manual merge is only for the same danger: same category at the same site. Scaffolding and
 * heat are two problems with two fixes, so they stay two reports.
 */
export function canMerge(source: Hazard, target: Hazard): boolean {
  return (
    source.id !== target.id &&
    source.category === target.category &&
    source.siteId === target.siteId &&
    !source.mergedInto &&
    !target.mergedInto &&
    isOpen(target)
  );
}
