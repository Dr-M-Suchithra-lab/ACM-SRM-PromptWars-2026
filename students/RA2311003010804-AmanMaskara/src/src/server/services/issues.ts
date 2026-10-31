import { createHmac } from "node:crypto";
import { addSignature, canTransitionIssue, signaturesNeeded, visibleToAdmin, type IssueStatus } from "@/core/cosign";
import { getISTDay } from "@/core/time";
import { redactPII } from "@/ai/redact";
import type { Repos, SiteIssue } from "@/server/repos/types";

/**
 * Signer key = HMAC(secret, "issue|worker|issue"). It proves "this worker already signed"
 * without storing who signed: the stored key is useless without the server secret, and the
 * issue never holds a worker id — not even its creator's.
 */
export function signerKey(secret: string, workerId: string, issueId: string): string {
  return createHmac("sha256", secret).update(`issue|${workerId}|${issueId}`).digest("hex");
}

export interface WorkerIssueView extends SiteIssue {
  signed: boolean;
  needed: number;
}

/** Open issues at the worker's site, with whether this worker signed (computed, never stored). */
export async function issuesForWorker(
  repos: Repos,
  siteId: string,
  workerId: string,
  secret: string,
): Promise<WorkerIssueView[]> {
  const issues = await repos.issues.getBySite(siteId);
  const views = await Promise.all(
    issues.map(async (issue) => ({
      ...issue,
      signed: await repos.issueSigners.has(signerKey(secret, workerId, issue.id)),
      needed: signaturesNeeded(issue),
    })),
  );
  return views.sort((a, b) => b.updatedDay.localeCompare(a.updatedDay) || b.signerCount - a.signerCount);
}

export type IssueError = "already_signed" | "closed" | "not_found" | "invalid_transition" | "response_required";

export async function signIssue(
  repos: Repos,
  input: { workerId: string; siteId: string; issueId: string; now: Date; secret: string },
): Promise<{ ok: true; escalated: boolean } | { ok: false; error: IssueError }> {
  const issue = await repos.issues.getById(input.issueId);
  if (!issue || issue.siteId !== input.siteId) return { ok: false, error: "not_found" };
  const key = signerKey(input.secret, input.workerId, issue.id);
  const result = addSignature(issue, await repos.issueSigners.has(key));
  if (!result.ok) return result;
  await repos.issueSigners.add(key);
  await repos.issues.update(issue.id, {
    signerCount: result.issue.signerCount,
    status: result.issue.status,
    updatedDay: getISTDay(input.now),
  });
  return { ok: true, escalated: result.escalated };
}

/** Raise a new issue. Text is PII-scrubbed and the creator becomes its first (anonymous) signer. */
export async function raiseIssue(
  repos: Repos,
  input: { workerId: string; orgId: string; siteId: string; text: string; now: Date; secret: string },
): Promise<SiteIssue> {
  const [workers, admins] = await Promise.all([repos.workers.getByOrg(input.orgId), repos.admins.getAll()]);
  const names = [...workers.map((w) => w.name), ...admins.filter((a) => a.orgId === input.orgId).map((a) => a.name)];
  const day = getISTDay(input.now);
  const issue: SiteIssue = {
    id: `iss-${crypto.randomUUID()}`,
    orgId: input.orgId,
    siteId: input.siteId,
    text: redactPII(input.text.trim(), names),
    signerCount: 0,
    status: "gathering",
    createdDay: day,
    updatedDay: day,
  };
  await repos.issues.create(issue);
  await signIssue(repos, {
    workerId: input.workerId,
    siteId: input.siteId,
    issueId: issue.id,
    now: input.now,
    secret: input.secret,
  });
  return (await repos.issues.getById(issue.id))!;
}

/** What management can see: nothing below the threshold, not even a count. */
export async function issuesForAdmin(repos: Repos, orgId: string): Promise<SiteIssue[]> {
  return visibleToAdmin(await repos.issues.getByOrg(orgId)).sort((a, b) => b.updatedDay.localeCompare(a.updatedDay));
}

export async function respondToIssue(
  repos: Repos,
  input: { orgId: string; issueId: string; status: IssueStatus; response?: string; now: Date },
): Promise<{ ok: true } | { ok: false; error: IssueError }> {
  const issue = await repos.issues.getById(input.issueId);
  if (!issue || issue.orgId !== input.orgId || issue.status === "gathering") return { ok: false, error: "not_found" };
  if (!canTransitionIssue(issue.status, input.status)) return { ok: false, error: "invalid_transition" };
  const response = input.response?.trim();
  if (!response) return { ok: false, error: "response_required" };
  await repos.issues.update(issue.id, { status: input.status, response, updatedDay: getISTDay(input.now) });
  return { ok: true };
}
