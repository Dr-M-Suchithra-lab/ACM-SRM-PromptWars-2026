"use server";

import { redirect, RedirectType } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { RateLimiter } from "@/server/rate-limit";
import { feedbackHmacSecret } from "@/server/secrets";
import { JpegDataUrl } from "@/server/validation";
import { confirmFix, duplicateFor, hazardByTrackingRef, reportHazard } from "@/server/services/hazards";
import { getSectorProfile } from "@/core/sectors";
import type { HazardCategory } from "@/core/types";
import { HAZARD_CATEGORIES, SEVERITIES } from "@/ai/schemas";
import { rememberReport, trackedReports } from "@/server/hazard-tracking";

/** Ten reports an hour is plenty for one person; more is a stuck button or abuse. */
const reportLimiter = new RateLimiter({ maxTokens: 10, refillIntervalMs: 60 * 60 * 1000 });
const confirmLimiter = new RateLimiter({ maxTokens: 20, refillIntervalMs: 60 * 60 * 1000 });

const Location = z.string().trim().max(120).optional();

const SubmitHazard = z.object({
  category: z.enum(HAZARD_CATEGORIES),
  severityHint: z.enum(SEVERITIES).optional(),
  transcript: z.string().max(500).optional(),
  transcriptEn: z.string().max(500).optional(),
  locationHint: Location,
  hideName: z.boolean(),
  attach: z.enum(["auto", "new"]).default("auto"),
  photo: JpegDataUrl.optional(),
});

async function allowedCategory(orgId: string, category: string): Promise<HazardCategory | null> {
  const org = await getRepos().orgs.getById(orgId);
  if (!org) return null;
  const allowed: readonly string[] = getSectorProfile(org.sector).hazardCategories;
  return allowed.includes(category) ? (category as HazardCategory) : null;
}

const DuplicateCheck = z.object({ category: z.enum(HAZARD_CATEGORIES), location: Location });

/** "Someone already reported this" — says how many, never who. */
export async function checkDuplicateAction(input: unknown): Promise<{ reportCount: number } | null> {
  const session = await requireRole("worker");
  const parsed = DuplicateCheck.safeParse(input);
  if (!parsed.success || !session.siteId) return null;
  const category = await allowedCategory(session.orgId, parsed.data.category);
  if (!category) return null;
  return duplicateFor(getRepos(), {
    orgId: session.orgId,
    siteId: session.siteId,
    category,
    location: parsed.data.location,
    now: new Date(),
  });
}

export async function submitHazardAction(input: unknown): Promise<{ error: string } | void> {
  const session = await requireRole("worker");
  const parsed = SubmitHazard.safeParse(input);
  if (!parsed.success || !session.siteId) return { error: "invalid" };
  if (!reportLimiter.check(session.uid)) return { error: "rate_limited" };
  const data = parsed.data;
  // "other" or a category from another sector must be re-picked from the icon grid.
  const category = await allowedCategory(session.orgId, data.category);
  if (!category) return { error: "pick_category" };

  const result = await reportHazard(getRepos(), {
    workerId: session.uid,
    orgId: session.orgId,
    siteId: session.siteId,
    category,
    severityHint: data.severityHint,
    transcript: data.transcript,
    transcriptEn: data.transcriptEn,
    location: data.locationHint,
    photo: data.photo,
    hideName: data.hideName,
    attach: data.attach,
    now: new Date(),
    secret: feedbackHmacSecret(),
  });
  if (result.trackingRef) await rememberReport({ hazardId: result.hazardId, ref: result.trackingRef });
  revalidatePath("/a/hazards");
  revalidatePath("/w/report");
  // Replace: Back from the confirmation goes to the report list, never into a half-filled form.
  redirect(`/w/report/${result.hazardId}?new=${result.merged ? "merged" : "1"}`, RedirectType.replace);
}

const ConfirmFix = z.object({ hazardId: z.string().max(60), fixed: z.boolean() });

/** The reporter closes the loop: "Is it really fixed?" */
export async function confirmFixAction(input: unknown): Promise<{ ok: boolean }> {
  const session = await requireRole("worker");
  const parsed = ConfirmFix.safeParse(input);
  if (!parsed.success || !confirmLimiter.check(session.uid)) return { ok: false };
  const result = await confirmFix(getRepos(), {
    orgId: session.orgId,
    hazardId: parsed.data.hazardId,
    workerId: session.uid,
    // Every reference on this phone: a merged report keeps its reporters' references.
    trackingRefs: (await trackedReports()).map((t) => t.ref),
    fixed: parsed.data.fixed,
    now: new Date(),
    secret: feedbackHmacSecret(),
  });
  revalidatePath(`/w/report/${parsed.data.hazardId}`);
  revalidatePath("/a/hazards");
  return { ok: result.ok };
}

const TrackingRef = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^FS-[A-Z0-9]{6}$/);

/** Follow an anonymous report from another phone by typing its private reference. */
export async function trackByRefAction(ref: unknown): Promise<{ hazardId: string } | { error: "not_found" }> {
  const session = await requireRole("worker");
  const parsed = TrackingRef.safeParse(ref);
  if (!parsed.success || !confirmLimiter.check(session.uid)) return { error: "not_found" };
  const hazard = await hazardByTrackingRef(getRepos(), session.orgId, parsed.data, feedbackHmacSecret());
  if (!hazard) return { error: "not_found" };
  await rememberReport({ hazardId: hazard.id, ref: parsed.data });
  revalidatePath("/w/report");
  return { hazardId: hazard.id };
}
