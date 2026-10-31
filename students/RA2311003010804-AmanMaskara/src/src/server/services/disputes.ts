import type { DisputeStatus, PayDispute, Repos } from "@/server/repos/types";
import { payCheckFor } from "./pay-check";

export type DisputeError = "no_shortfall" | "already_open" | "not_found" | "invalid_transition" | "note_required";

/** Disputes the worker raised that are still being handled. Used by quit-risk. */
export const isActiveDispute = (d: Pick<PayDispute, "status">): boolean => d.status !== "resolved";

/** A worker asks for a review of a possible shortfall. Only possible when the check found one. */
export async function requestPayReview(
  repos: Repos,
  input: { workerId: string; orgId: string; month: string; now: Date },
): Promise<{ ok: true; dispute: PayDispute } | { ok: false; error: DisputeError }> {
  const check = await payCheckFor(repos, input.workerId, input.month);
  if (!check || check.outstanding === 0) return { ok: false, error: "no_shortfall" };
  const existing = await repos.payDisputes.getByWorker(input.workerId);
  if (existing.some((d) => d.month === input.month && isActiveDispute(d))) return { ok: false, error: "already_open" };

  const dispute: PayDispute = {
    id: `pd-${crypto.randomUUID()}`,
    orgId: input.orgId,
    workerId: input.workerId,
    month: input.month,
    shortfall: check.outstanding,
    findings: check.result.findings.map((f) => f.code),
    status: "open",
    createdAt: input.now,
    updatedAt: input.now,
  };
  await repos.payDisputes.create(dispute);
  return { ok: true, dispute };
}

const NEXT: Record<DisputeStatus, DisputeStatus[]> = {
  open: ["reviewing", "resolved"],
  reviewing: ["resolved"],
  resolved: [],
};

/** Management moves a dispute open → reviewing → resolved. Resolving always needs a note for the worker. */
export async function updateDispute(
  repos: Repos,
  input: { id: string; orgId: string; status: DisputeStatus; note?: string; now: Date },
): Promise<{ ok: true } | { ok: false; error: DisputeError }> {
  const dispute = await repos.payDisputes.getById(input.id);
  if (!dispute || dispute.orgId !== input.orgId) return { ok: false, error: "not_found" };
  if (!NEXT[dispute.status].includes(input.status)) return { ok: false, error: "invalid_transition" };
  const note = input.note?.trim();
  if (input.status === "resolved" && !note) return { ok: false, error: "note_required" };
  await repos.payDisputes.update(dispute.id, {
    status: input.status,
    resolutionNote: note || dispute.resolutionNote,
    updatedAt: input.now,
  });
  return { ok: true };
}
