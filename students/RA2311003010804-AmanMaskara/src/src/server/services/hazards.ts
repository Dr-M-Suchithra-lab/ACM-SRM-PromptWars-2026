import { createHmac, randomBytes } from "node:crypto";
import { ESCALATION_CHAINS } from "@/config/hazard-sla";
import { applyHazardAction, isOpen, sweepHazard, type ActionError, type HazardAction } from "@/core/hazard-lifecycle";
import { canMerge, findDuplicateHazard, severityForReports } from "@/core/hazard-duplicates";
import { maxSeverity, resolveSeverity } from "@/core/hazard-rules";
import { urgencyFromText } from "@/core/hazard-urgency";
import type { Hazard, HazardCategory, HazardReport, HazardSeverity } from "@/core/types";
import type { Repos } from "@/server/repos/types";

// ── Private tracking references for anonymous reports ─────────────

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I: easy to read aloud

/** e.g. "FS-7KQ2MZ": shown once to an anonymous reporter so they can follow up without a name. */
export function newTrackingRef(): string {
  return `FS-${[...randomBytes(6)].map((b) => REF_ALPHABET[b % REF_ALPHABET.length]).join("")}`;
}

/** Only this one-way hash is stored on the hazard, never the reference itself. */
export function trackingRefHash(secret: string, ref: string): string {
  return createHmac("sha256", secret).update(`track|${ref.trim().toUpperCase()}`).digest("hex");
}

export function isReporter(hazard: Hazard, workerId: string): boolean {
  return hazard.reports.some((r) => r.reporterId === workerId);
}

// ── Reporting, with duplicate merging ─────────────────────────────

export interface ReportInput {
  workerId: string;
  orgId: string;
  siteId: string;
  category: HazardCategory;
  severityHint?: HazardSeverity;
  transcript?: string;
  transcriptEn?: string;
  location?: string;
  photo?: string;
  hideName: boolean;
  /** "auto" joins a matching open report; "new" is the worker saying "this is a different problem" */
  attach: "auto" | "new";
  now: Date;
  secret: string;
}

export interface ReportResult {
  hazardId: string;
  merged: boolean;
  /** Only for anonymous reports */
  trackingRef?: string;
}

async function openHazards(repos: Repos, orgId: string): Promise<Hazard[]> {
  return (await repos.hazards.getByOrg(orgId)).filter(isOpen);
}

/** Before sending: is there already an open report of this danger here? (Never says by whom.) */
export async function duplicateFor(
  repos: Repos,
  input: Pick<ReportInput, "orgId" | "siteId" | "category" | "location" | "now">,
): Promise<{ reportCount: number } | null> {
  const match = findDuplicateHazard(
    { category: input.category, siteId: input.siteId, location: input.location, at: input.now },
    await openHazards(repos, input.orgId),
  );
  return match ? { reportCount: match.reports.length } : null;
}

export async function reportHazard(repos: Repos, input: ReportInput): Promise<ReportResult> {
  const trackingRef = input.hideName ? newTrackingRef() : undefined;
  const refHashes = trackingRef ? [trackingRefHash(input.secret, trackingRef)] : [];
  const report: HazardReport = {
    reporterId: input.hideName ? null : input.workerId,
    transcript: input.transcript,
    transcriptEn: input.transcriptEn,
    photoDataUrl: input.photo,
    at: input.now,
  };

  const duplicate =
    input.attach === "auto"
      ? findDuplicateHazard(
          { category: input.category, siteId: input.siteId, location: input.location, at: input.now },
          await openHazards(repos, input.orgId),
        )
      : null;

  // Severity: the category's floor, raised by Gemini's reading of the report and by urgent words in it.
  const severity = maxSeverity(
    resolveSeverity(input.category, input.severityHint),
    urgencyFromText(input.transcript, input.transcriptEn) ?? "low",
  );

  if (duplicate) {
    const reports = [...duplicate.reports, report];
    await repos.hazards.update(duplicate.id, {
      reports,
      severity: maxSeverity(
        maxSeverity(duplicate.severity, severity),
        severityForReports(duplicate.baseSeverity, reports.length),
      ),
      trackingRefs: [...duplicate.trackingRefs, ...refHashes],
      timeline: [...duplicate.timeline, { status: "report_added", at: input.now }],
    });
    return { hazardId: duplicate.id, merged: true, trackingRef };
  }

  const hazard: Hazard = {
    id: `haz-${crypto.randomUUID()}`,
    siteId: input.siteId,
    orgId: input.orgId,
    category: input.category,
    baseSeverity: severity,
    severity,
    status: "received",
    location: input.location?.trim() || undefined,
    reports: [report],
    timeline: [{ status: "received", at: input.now }],
    createdAt: input.now,
    escalationLevel: 0,
    trackingRefs: refHashes,
  };
  await repos.hazards.create(hazard);
  return { hazardId: hazard.id, merged: false, trackingRef };
}

// ── Time-based escalation and auto-close ──────────────────────────

/**
 * Apply deadline escalations and auto-closes for an organisation. Idempotent, so it runs
 * whenever hazards are read (and from the optional Cloud Scheduler cron route).
 */
export async function sweepHazards(repos: Repos, orgId: string, now: Date): Promise<Hazard[]> {
  const [org, hazards] = await Promise.all([repos.orgs.getById(orgId), repos.hazards.getByOrg(orgId)]);
  if (!org) return hazards;
  const chainLength = ESCALATION_CHAINS[org.sector].length;
  return Promise.all(
    hazards.map(async (hazard) => {
      const swept = sweepHazard(hazard, now, chainLength);
      if (!swept) return hazard;
      await repos.hazards.update(hazard.id, {
        escalationLevel: swept.escalationLevel,
        confirmation: swept.confirmation,
        timeline: swept.timeline,
      });
      return swept;
    }),
  );
}

// ── Actions ───────────────────────────────────────────────────────

export type HazardServiceError = ActionError | "not_found" | "forbidden";

async function persist(repos: Repos, before: Hazard, after: Hazard): Promise<void> {
  const changed: Partial<Hazard> = {};
  for (const key of Object.keys({ ...before, ...after }) as (keyof Hazard)[]) {
    if (before[key] !== after[key]) (changed as Record<string, unknown>)[key] = after[key];
  }
  await repos.hazards.update(before.id, changed);
}

export async function adminHazardAction(
  repos: Repos,
  input: {
    orgId: string;
    hazardId: string;
    adminId: string;
    action: Exclude<HazardAction, { type: "confirm" }>;
    now: Date;
  },
): Promise<{ ok: true } | { ok: false; error: HazardServiceError }> {
  const hazard = await repos.hazards.getById(input.hazardId);
  if (!hazard || hazard.orgId !== input.orgId) return { ok: false, error: "not_found" };
  const result = applyHazardAction(hazard, input.action, input.now, input.adminId);
  if (!result.ok) return result;
  await persist(repos, hazard, result.hazard);
  return { ok: true };
}

/** "Is it really fixed?" — only the reporter, or the device holding the private reference. */
export async function confirmFix(
  repos: Repos,
  input: {
    orgId: string;
    hazardId: string;
    workerId: string;
    trackingRefs: string[];
    fixed: boolean;
    now: Date;
    secret: string;
  },
): Promise<{ ok: true } | { ok: false; error: HazardServiceError }> {
  const hazard = await repos.hazards.getById(input.hazardId);
  if (!hazard || hazard.orgId !== input.orgId) return { ok: false, error: "not_found" };
  const viaRef = input.trackingRefs.some((ref) => hazard.trackingRefs.includes(trackingRefHash(input.secret, ref)));
  if (!isReporter(hazard, input.workerId) && !viaRef) return { ok: false, error: "forbidden" };
  const result = applyHazardAction(hazard, { type: "confirm", fixed: input.fixed }, input.now);
  if (!result.ok) return result;
  await persist(repos, hazard, result.hazard);
  return { ok: true };
}

/** The hazard an anonymous reporter's private reference belongs to (for following up on another device). */
export async function hazardByTrackingRef(
  repos: Repos,
  orgId: string,
  ref: string,
  secret: string,
): Promise<Hazard | undefined> {
  const hash = trackingRefHash(secret, ref);
  return (await repos.hazards.getByOrg(orgId)).find((h) => h.trackingRefs.includes(hash));
}

// ── Manual merge / unmerge ────────────────────────────────────────

export async function mergeHazards(
  repos: Repos,
  input: { orgId: string; sourceId: string; targetId: string; adminId: string; now: Date },
): Promise<{ ok: true } | { ok: false; error: HazardServiceError }> {
  const [source, target] = await Promise.all([
    repos.hazards.getById(input.sourceId),
    repos.hazards.getById(input.targetId),
  ]);
  if (!source || !target || source.id === target.id || source.orgId !== input.orgId || target.orgId !== input.orgId)
    return { ok: false, error: "not_found" };
  // Only the same danger at the same site: different hazards need different fixes.
  if (!canMerge(source, target)) return { ok: false, error: "invalid_transition" };

  const reports = [...target.reports, ...source.reports.map((r) => ({ ...r, fromHazardId: source.id }))];
  await repos.hazards.update(target.id, {
    reports,
    trackingRefs: [...new Set([...target.trackingRefs, ...source.trackingRefs])],
    severity: maxSeverity(
      maxSeverity(target.severity, source.severity),
      severityForReports(target.baseSeverity, reports.length),
    ),
    timeline: [...target.timeline, { status: "merged", at: input.now, by: input.adminId, note: source.id }],
  });
  await repos.hazards.update(source.id, {
    mergedInto: target.id,
    timeline: [...source.timeline, { status: "merged", at: input.now, by: input.adminId, note: target.id }],
  });
  return { ok: true };
}

export async function unmergeHazard(
  repos: Repos,
  input: { orgId: string; sourceId: string; adminId: string; now: Date },
): Promise<{ ok: true } | { ok: false; error: HazardServiceError }> {
  const source = await repos.hazards.getById(input.sourceId);
  const target = source?.mergedInto ? await repos.hazards.getById(source.mergedInto) : undefined;
  if (!source || !target || source.orgId !== input.orgId) return { ok: false, error: "not_found" };

  const reports = target.reports.filter((r) => r.fromHazardId !== source.id);
  const sourceRefs = new Set(source.trackingRefs);
  await repos.hazards.update(target.id, {
    reports,
    trackingRefs: target.trackingRefs.filter((ref) => !sourceRefs.has(ref)),
    severity: severityForReports(target.baseSeverity, reports.length),
    timeline: [...target.timeline, { status: "unmerged", at: input.now, by: input.adminId, note: source.id }],
  });
  await repos.hazards.update(source.id, {
    mergedInto: undefined,
    timeline: [...source.timeline, { status: "unmerged", at: input.now, by: input.adminId }],
  });
  return { ok: true };
}
