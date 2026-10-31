import { z } from "zod";
import type { Repos, Skill, Worker } from "@/server/repos/types";

/** What a worker (or an admin, for a worker) types in. The date is the day the training was completed. */
export const SkillInput = z.object({
  title: z.string().trim().min(2).max(80),
  issuer: z.string().trim().min(2).max(80),
  date: z.iso.date().refine((d) => new Date(d).getTime() <= Date.now(), "future"),
  evidence: z.string().trim().max(120).optional(),
});
export type SkillInput = z.infer<typeof SkillInput>;

/** A worker can have at most this many skills awaiting verification at once. */
export const MAX_PENDING_SKILLS = 10;

export type SkillError = "not_found" | "not_pending" | "too_many";

export function isPendingSkill(skill: Skill): boolean {
  return !skill.verifiedBy && !skill.rejected;
}

function newSkill(workerId: string, input: SkillInput, now: Date): Skill {
  return {
    id: `sk-${crypto.randomUUID()}`,
    workerId,
    title: input.title,
    issuer: input.issuer,
    date: new Date(input.date),
    evidence: input.evidence || undefined,
    createdAt: now,
  };
}

/** The worker's own claim: pending until their employer verifies it. */
export async function addSkillByWorker(
  repos: Repos,
  workerId: string,
  input: SkillInput,
  now: Date,
): Promise<{ ok: true } | { ok: false; error: SkillError }> {
  const pending = (await repos.skills.getByWorker(workerId)).filter(isPendingSkill);
  if (pending.length >= MAX_PENDING_SKILLS) return { ok: false, error: "too_many" };
  await repos.skills.create({ ...newSkill(workerId, input, now), addedBy: "worker" });
  return { ok: true };
}

/** An admin adding a skill they have checked themselves: verified on entry. */
export async function addSkillByAdmin(
  repos: Repos,
  input: SkillInput & { workerId: string; orgId: string; adminId: string; now: Date },
): Promise<{ ok: true } | { ok: false; error: SkillError }> {
  const worker = await repos.workers.getById(input.workerId);
  if (!worker || worker.orgId !== input.orgId) return { ok: false, error: "not_found" };
  await repos.skills.create({
    ...newSkill(worker.id, input, input.now),
    addedBy: "admin",
    verifiedBy: input.adminId,
    decidedAt: input.now,
  });
  return { ok: true };
}

/** Verify (it then appears on the passport) or reject a pending skill of a worker in this organisation. */
export async function decideSkill(
  repos: Repos,
  input: { id: string; orgId: string; adminId: string; verify: boolean; now: Date },
): Promise<{ ok: true } | { ok: false; error: SkillError }> {
  const skill = await repos.skills.getById(input.id);
  const worker = skill ? await repos.workers.getById(skill.workerId) : undefined;
  if (!skill || !worker || worker.orgId !== input.orgId) return { ok: false, error: "not_found" };
  if (!isPendingSkill(skill)) return { ok: false, error: "not_pending" };
  await repos.skills.update(
    skill.id,
    input.verify ? { verifiedBy: input.adminId, decidedAt: input.now } : { rejected: true, decidedAt: input.now },
  );
  return { ok: true };
}

/** The admin's queue: every pending skill in the organisation, oldest first, with its worker. */
export async function pendingSkills(repos: Repos, orgId: string): Promise<{ skill: Skill; worker: Worker }[]> {
  const workers = await repos.workers.getByOrg(orgId);
  const byId = new Map(workers.map((w) => [w.id, w]));
  const skills = await repos.skills.getByWorkers(workers.map((w) => w.id));
  return skills
    .filter(isPendingSkill)
    .sort((a, b) => (a.createdAt ?? a.date).getTime() - (b.createdAt ?? b.date).getTime())
    .flatMap((skill) => {
      const worker = byId.get(skill.workerId);
      return worker ? [{ skill, worker }] : [];
    });
}
