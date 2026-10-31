"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { RateLimiter } from "@/server/rate-limit";
import { feedbackHmacSecret } from "@/server/secrets";
import { raiseIssue, respondToIssue, signIssue } from "@/server/services/issues";
import { findSimilarIssues } from "@/ai/similar";
import { Note } from "@/server/validation";

const IssueText = z.string().trim().min(5).max(300);
/** Three new issues a day per worker: enough to speak up, too few to flood the board. */
const raiseLimiter = new RateLimiter({ maxTokens: 3, refillIntervalMs: 24 * 60 * 60 * 1000 });
const signLimiter = new RateLimiter({ maxTokens: 30, refillIntervalMs: 60 * 60 * 1000 });
const similarLimiter = new RateLimiter({ maxTokens: 10, refillIntervalMs: 60_000 });

function refresh(): void {
  revalidatePath("/w/feedback");
  revalidatePath("/a/feedback");
  revalidatePath("/a");
}

/** "Is it one of these?" — open issues at the worker's site that say the same thing. */
export async function similarIssuesAction(text: unknown): Promise<string[]> {
  const session = await requireRole("worker");
  const parsed = IssueText.safeParse(text);
  if (!parsed.success || !session.siteId || !similarLimiter.check(session.uid)) return [];
  const open = (await getRepos().issues.getBySite(session.siteId)).filter((i) => i.status !== "resolved");
  const { ids } = await findSimilarIssues(
    parsed.data,
    open.map((i) => ({ id: i.id, text: i.text })),
  );
  return ids;
}

export async function raiseIssueAction(text: unknown): Promise<{ ok: boolean; error?: string }> {
  const session = await requireRole("worker");
  const parsed = IssueText.safeParse(text);
  if (!parsed.success || !session.siteId) return { ok: false, error: "invalid" };
  if (!raiseLimiter.check(session.uid)) return { ok: false, error: "rate_limited" };
  await raiseIssue(getRepos(), {
    workerId: session.uid,
    orgId: session.orgId,
    siteId: session.siteId,
    text: parsed.data,
    now: new Date(),
    secret: feedbackHmacSecret(),
  });
  refresh();
  return { ok: true };
}

export async function signIssueAction(issueId: unknown): Promise<{ ok: boolean; escalated?: boolean; error?: string }> {
  const session = await requireRole("worker");
  const parsed = z.string().max(80).safeParse(issueId);
  if (!parsed.success || !session.siteId) return { ok: false, error: "invalid" };
  if (!signLimiter.check(session.uid)) return { ok: false, error: "rate_limited" };
  const result = await signIssue(getRepos(), {
    workerId: session.uid,
    siteId: session.siteId,
    issueId: parsed.data,
    now: new Date(),
    secret: feedbackHmacSecret(),
  });
  refresh();
  return result.ok ? { ok: true, escalated: result.escalated } : { ok: false, error: result.error };
}

const Response = z.object({
  issueId: z.string().max(80),
  status: z.enum(["acknowledged", "resolved"]),
  response: Note,
});

/** Management's answer is shown to every worker at the site. */
export async function respondIssueAction(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const session = await requireRole("admin");
  const parsed = Response.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const result = await respondToIssue(getRepos(), { orgId: session.orgId, ...parsed.data, now: new Date() });
  refresh();
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
