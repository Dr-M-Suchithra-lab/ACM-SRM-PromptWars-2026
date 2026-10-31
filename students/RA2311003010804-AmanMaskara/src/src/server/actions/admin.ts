"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { adminHazardAction, mergeHazards, unmergeHazard } from "@/server/services/hazards";
import { JpegDataUrl, Note } from "@/server/validation";
import { DISMISS_REASONS } from "@/config/hazard-sla";

export type AdminActionState = { ok?: boolean; error?: string };

const HazardId = z.string().min(1).max(100);

const HazardAction = z.discriminatedUnion("type", [
  z.object({ type: z.literal("start"), hazardId: HazardId }),
  z.object({ type: z.literal("reopen"), hazardId: HazardId }),
  z.object({ type: z.literal("fix"), hazardId: HazardId, note: Note, photo: JpegDataUrl.optional() }),
  z.object({ type: z.literal("dismiss"), hazardId: HazardId, reason: z.enum(DISMISS_REASONS), note: Note.optional() }),
]);

function refresh(hazardId?: string): void {
  revalidatePath("/a/hazards");
  revalidatePath("/a");
  revalidatePath("/w/report");
  if (hazardId) revalidatePath(`/w/report/${hazardId}`);
}

/** Every hazard status change goes through the pure lifecycle rules (reason and note checks included). */
export async function hazardStatusAction(input: unknown): Promise<AdminActionState> {
  const session = await requireRole("admin");
  const parsed = HazardAction.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const { hazardId, ...action } = parsed.data;
  const result = await adminHazardAction(getRepos(), {
    orgId: session.orgId,
    hazardId,
    adminId: session.uid,
    action,
    now: new Date(),
  });
  if (!result.ok) return { error: result.error };
  refresh(hazardId);
  return { ok: true };
}

const Merge = z.object({ sourceId: HazardId, targetId: HazardId });

/** Attach one report to another by hand (same danger reported twice). */
export async function mergeHazardAction(input: unknown): Promise<AdminActionState> {
  const session = await requireRole("admin");
  const parsed = Merge.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const result = await mergeHazards(getRepos(), {
    orgId: session.orgId,
    ...parsed.data,
    adminId: session.uid,
    now: new Date(),
  });
  if (!result.ok) return { error: result.error };
  refresh();
  return { ok: true };
}

export async function unmergeHazardAction(input: unknown): Promise<AdminActionState> {
  const session = await requireRole("admin");
  const parsed = z.object({ sourceId: HazardId }).safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const result = await unmergeHazard(getRepos(), {
    orgId: session.orgId,
    sourceId: parsed.data.sourceId,
    adminId: session.uid,
    now: new Date(),
  });
  if (!result.ok) return { error: result.error };
  refresh();
  return { ok: true };
}
