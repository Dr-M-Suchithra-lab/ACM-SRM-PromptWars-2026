"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { buildPayslip } from "@/server/services/payslip";
import { requestPayReview } from "@/server/services/disputes";
import { payTemplate } from "@/server/pay-explain";
import { explainPay } from "@/ai/explain-pay";
import { RateLimiter } from "@/server/rate-limit";
import { isMonthKey } from "@/core/period";

const MonthKey = z.string().refine(isMonthKey);
const explainLimiter = new RateLimiter({ maxTokens: 10, refillIntervalMs: 60_000 });
const disputeLimiter = new RateLimiter({ maxTokens: 3, refillIntervalMs: 60 * 60 * 1000 });

/** Friendlier AI wording of the same payslip. null → keep showing the template. */
export async function explainPayAction(month: string): Promise<string[] | null> {
  const session = await requireRole("worker");
  if (!MonthKey.safeParse(month).success) return null;
  if (!explainLimiter.check(session.uid)) return null;
  const view = await buildPayslip(getRepos(), session.uid, month);
  if (!view) return null;
  const { sentences, facts } = await payTemplate(view);
  return explainPay(facts, sentences, await getLocale());
}

/** "Request review" on a possible shortfall: opens a pay dispute the employer must answer. */
export async function requestPayReviewAction(month: unknown): Promise<{ ok: boolean; error?: string }> {
  const session = await requireRole("worker");
  const parsed = MonthKey.safeParse(month);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (!disputeLimiter.check(session.uid)) return { ok: false, error: "rate_limited" };
  const result = await requestPayReview(getRepos(), {
    workerId: session.uid,
    orgId: session.orgId,
    month: parsed.data,
    now: new Date(),
  });
  revalidatePath("/w/pay");
  revalidatePath("/a/payroll");
  revalidatePath("/a");
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
