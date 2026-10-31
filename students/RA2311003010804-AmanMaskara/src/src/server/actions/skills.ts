"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { RateLimiter } from "@/server/rate-limit";
import { addSkillByAdmin, addSkillByWorker, decideSkill, SkillInput } from "@/server/services/skills";

const addLimiter = new RateLimiter({ maxTokens: 10, refillIntervalMs: 60 * 60 * 1000 });

export type SkillFormState = { ok?: boolean; error?: "invalid" | "too_many" | "rate_limited" | "not_found" };

function fields(formData: FormData) {
  return {
    title: formData.get("title"),
    issuer: formData.get("issuer"),
    date: formData.get("date"),
    evidence: formData.get("evidence") || undefined,
  };
}

function refresh(): void {
  revalidatePath("/w/skills");
  revalidatePath("/a/people");
}

/** A worker adds a training or certificate. It shows as "Pending" until the employer verifies it. */
export async function addSkillAction(_prev: SkillFormState, formData: FormData): Promise<SkillFormState> {
  const session = await requireRole("worker");
  const parsed = SkillInput.safeParse(fields(formData));
  if (!parsed.success) return { error: "invalid" };
  if (!addLimiter.check(session.uid)) return { error: "rate_limited" };
  const result = await addSkillByWorker(getRepos(), session.uid, parsed.data, new Date());
  if (!result.ok) return { error: result.error === "too_many" ? "too_many" : "invalid" };
  refresh();
  return { ok: true };
}

/** An admin records a skill they have checked: it is verified straight away. */
export async function adminAddSkillAction(_prev: SkillFormState, formData: FormData): Promise<SkillFormState> {
  const session = await requireRole("admin");
  const parsed = SkillInput.extend({ workerId: z.string().max(40) }).safeParse({
    ...fields(formData),
    workerId: formData.get("workerId"),
  });
  if (!parsed.success) return { error: "invalid" };
  if (!addLimiter.check(session.uid)) return { error: "rate_limited" };
  const result = await addSkillByAdmin(getRepos(), {
    ...parsed.data,
    orgId: session.orgId,
    adminId: session.uid,
    now: new Date(),
  });
  if (!result.ok) return { error: "not_found" };
  refresh();
  return { ok: true };
}

const Decision = z.object({ id: z.string().max(80), verify: z.boolean() });

/** Verify (it appears on the skill passport) or reject a worker's pending skill. */
export async function decideSkillAction(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const session = await requireRole("admin");
  const parsed = Decision.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const result = await decideSkill(getRepos(), {
    ...parsed.data,
    orgId: session.orgId,
    adminId: session.uid,
    now: new Date(),
  });
  refresh();
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
