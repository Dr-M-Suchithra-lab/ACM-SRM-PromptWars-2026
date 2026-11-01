"use server";

import { getLocale } from "next-intl/server";
import { z } from "zod";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { RateLimiter } from "@/server/rate-limit";
import { adviseHelp, type HelpResult } from "@/ai/help";
import { redactPII } from "@/ai/redact";

const limiter = new RateLimiter({ maxTokens: 12, refillIntervalMs: 60 * 60 * 1000 });
const Problem = z.string().trim().min(3).max(800);

/**
 * "Ask for help": the worker describes a problem and gets next steps, the right helplines and
 * the place in FairShift to act on it. Names, phone numbers and IDs are scrubbed before
 * Gemini sees the text, and the text is never stored.
 */
export async function askHelpAction(input: unknown): Promise<HelpResult | { error: "invalid" | "rate_limited" }> {
  const session = await requireRole("worker");
  const parsed = Problem.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  if (!limiter.check(session.uid)) return { error: "rate_limited" };
  const repos = getRepos();
  const [workers, admins, locale] = await Promise.all([
    repos.workers.getByOrg(session.orgId),
    repos.admins.getAll(),
    getLocale(),
  ]);
  const names = [...workers.map((w) => w.name), ...admins.filter((a) => a.orgId === session.orgId).map((a) => a.name)];
  return adviseHelp(redactPII(parsed.data, names), locale);
}
