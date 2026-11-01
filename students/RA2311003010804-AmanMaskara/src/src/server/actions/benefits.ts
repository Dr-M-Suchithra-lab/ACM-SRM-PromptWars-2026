"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { RateLimiter } from "@/server/rate-limit";
import { decideCertificate, requestCertificate } from "@/server/services/benefits";
import { SCHEMES } from "@/config/schemes";

const SchemeId = z.enum(SCHEMES.map((s) => s.id) as [string, ...string[]]);
const requestLimiter = new RateLimiter({ maxTokens: 5, refillIntervalMs: 60 * 60 * 1000 });

export async function requestCertificateAction(schemeId: unknown): Promise<{ ok: boolean; error?: string }> {
  const session = await requireRole("worker");
  const parsed = SchemeId.safeParse(schemeId);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (!requestLimiter.check(session.uid)) return { ok: false, error: "rate_limited" };
  const result = await requestCertificate(getRepos(), {
    workerId: session.uid,
    schemeId: parsed.data,
    now: new Date(),
  });
  revalidatePath("/w/skills");
  revalidatePath("/a/people");
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

const Decision = z.object({ id: z.string().max(80), approve: z.boolean() });

/** Approving signs the certificate: the worker can then show it at the welfare board office. */
export async function decideCertificateAction(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const session = await requireRole("admin");
  const parsed = Decision.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const result = await decideCertificate(getRepos(), {
    ...parsed.data,
    orgId: session.orgId,
    adminId: session.uid,
    now: new Date(),
  });
  revalidatePath("/a/people");
  revalidatePath("/w/skills");
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
