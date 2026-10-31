// ─── "Safe in numbers": co-signed site issues ───────────────────────
// An issue stays invisible to management until K workers have signed it ("Me too"),
// reusing the same K as anonymous feedback. Signers are never stored, only one-way keys
// that stop double-signing (see server/services/issues.ts).

import { K_ANONYMITY } from "./anonymity";

export type IssueStatus = "gathering" | "escalated" | "acknowledged" | "resolved";

export interface CoSignable {
  signerCount: number;
  status: IssueStatus;
}

export type SignResult<T> =
  { ok: true; issue: T; escalated: boolean } | { ok: false; error: "already_signed" | "closed" };

/** Add one signature. The issue escalates on the signature that reaches `k`. */
export function addSignature<T extends CoSignable>(
  issue: T,
  alreadySigned: boolean,
  k: number = K_ANONYMITY,
): SignResult<T> {
  if (alreadySigned) return { ok: false, error: "already_signed" };
  if (issue.status === "resolved") return { ok: false, error: "closed" };
  const signerCount = issue.signerCount + 1;
  const escalated = issue.status === "gathering" && signerCount >= k;
  return { ok: true, issue: { ...issue, signerCount, status: escalated ? "escalated" : issue.status }, escalated };
}

/** Signatures still needed before management can see the issue (0 once escalated). */
export function signaturesNeeded(issue: CoSignable, k: number = K_ANONYMITY): number {
  return issue.status === "gathering" ? Math.max(0, k - issue.signerCount) : 0;
}

/** Management sees nothing below the threshold, not even that an issue exists. */
export function visibleToAdmin<T extends CoSignable>(issues: T[]): T[] {
  return issues.filter((issue) => issue.status !== "gathering");
}

const ISSUE_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  gathering: [],
  escalated: ["acknowledged", "resolved"],
  acknowledged: ["resolved"],
  resolved: [],
};

export function canTransitionIssue(from: IssueStatus, to: IssueStatus): boolean {
  return ISSUE_TRANSITIONS[from].includes(to);
}
