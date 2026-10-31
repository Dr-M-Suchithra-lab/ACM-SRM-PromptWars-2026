import { createHmac } from "node:crypto";
import { cohortKey, feedbackWeek } from "@/core/anonymity";
import { redactPII } from "@/ai/redact";
import type { Repos } from "@/server/repos/types";

export interface FeedbackInput {
  workerId: string;
  orgId: string;
  siteId: string;
  scores: { pay: number; safety: number; respect: number };
  comment?: string;
  now: Date;
  hmacSecret: string;
}

export type FeedbackResult = { ok: true } | { ok: false; error: "already_answered" };

/**
 * Stores feedback with NO worker identity. Double-submission is blocked with
 * HMAC(secret, worker + week): unlinkable to the stored answer, and useless without the secret.
 */
export async function submitFeedback(repos: Repos, input: FeedbackInput): Promise<FeedbackResult> {
  const week = feedbackWeek(input.now);
  const guard = createHmac("sha256", input.hmacSecret).update(`${input.workerId}|${week}`).digest("hex");
  if (await repos.feedbackGuards.has(guard)) return { ok: false, error: "already_answered" };

  let comment: string | undefined;
  if (input.comment?.trim()) {
    const [workers, admins] = await Promise.all([repos.workers.getByOrg(input.orgId), repos.admins.getAll()]);
    const names = [...workers.map((w) => w.name), ...admins.filter((a) => a.orgId === input.orgId).map((a) => a.name)];
    comment = redactPII(input.comment.trim(), names);
  }

  await repos.feedbackGuards.add(guard);
  await repos.feedback.create({
    id: `fb-${crypto.randomUUID()}`,
    orgId: input.orgId,
    siteId: input.siteId,
    cohort: cohortKey(input.siteId, "all"),
    weekBucket: week,
    scores: input.scores,
    comment,
    // Day precision only: an exact timestamp could be matched against check-in times.
    createdAt: new Date(`${input.now.toISOString().slice(0, 10)}T00:00:00Z`),
  });
  return { ok: true };
}

export async function hasAnsweredThisWeek(
  repos: Repos,
  workerId: string,
  now: Date,
  hmacSecret: string,
): Promise<boolean> {
  const guard = createHmac("sha256", hmacSecret)
    .update(`${workerId}|${feedbackWeek(now)}`)
    .digest("hex");
  return repos.feedbackGuards.has(guard);
}
