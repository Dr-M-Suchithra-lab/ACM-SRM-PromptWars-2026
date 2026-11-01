"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { MAX_BATCH, normaliseAccount, normaliseHolder, normaliseIfsc } from "@/core/payouts";
import { monthKey } from "@/core/period";
import { requireRole } from "@/server/dal";
import { currentOrigin } from "@/server/origin";
import { getCheckoutProvider } from "@/server/payouts/provider";
import { RateLimiter } from "@/server/rate-limit";
import { getRepos } from "@/server/repos";
import {
  answerPayoutAccount,
  cancelCheckout,
  completeSimulatedCheckout,
  confirmCheckout,
  savePayoutAccount,
  startCheckout,
  type AccountInputError,
  type StartCheckoutResult,
} from "@/server/services/payouts";

const checkoutLimiter = new RateLimiter({ maxTokens: 10, refillIntervalMs: 60 * 60 * 1000 });
const statusLimiter = new RateLimiter({ maxTokens: 60, refillIntervalMs: 60 * 60 * 1000 });
const accountLimiter = new RateLimiter({ maxTokens: 30, refillIntervalMs: 60 * 60 * 1000 });
const answerLimiter = new RateLimiter({ maxTokens: 10, refillIntervalMs: 60 * 60 * 1000 });

function refresh(): void {
  revalidatePath("/a/payroll");
  revalidatePath("/a");
  revalidatePath("/w/pay");
}

/** Only the three months the payroll page shows can be paid. */
const payableMonth = (month: string, now: Date) => [0, -1, -2].some((offset) => monthKey(now, offset) === month);

const BatchId = z.string().regex(/^fs\d{6}_[a-f0-9]{12}$/);

const StartInput = z.object({
  month: z.string().max(7),
  workerIds: z.array(z.string().max(40)).min(1).max(MAX_BATCH),
});

/** Opens the checkout and returns where to send the employer; the browser then navigates there. */
export async function startCheckoutAction(
  input: unknown,
): Promise<StartCheckoutResult | { ok: false; error: "rate_limited" | "unavailable" }> {
  const session = await requireRole("admin");
  const parsed = StartInput.safeParse(input);
  const now = new Date();
  if (!parsed.success || !payableMonth(parsed.data.month, now)) return { ok: false, error: "invalid" };
  if (!checkoutLimiter.check(session.uid)) return { ok: false, error: "rate_limited" };
  const provider = getCheckoutProvider();
  if (!provider) return { ok: false, error: "unavailable" };
  const result = await startCheckout(getRepos(), provider, {
    ...parsed.data,
    orgId: session.orgId,
    adminId: session.uid,
    randomHex: randomBytes(6).toString("hex"),
    origin: await currentOrigin(),
    now,
  });
  refresh();
  return result;
}

export async function confirmCheckoutAction(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const session = await requireRole("admin");
  const parsed = z.object({ batchId: BatchId }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (!statusLimiter.check(session.uid)) return { ok: false, error: "rate_limited" };
  const provider = getCheckoutProvider();
  if (!provider) return { ok: false, error: "unavailable" };
  const result = await confirmCheckout(getRepos(), provider, { ...parsed.data, orgId: session.orgId, now: new Date() });
  refresh();
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function cancelCheckoutAction(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const session = await requireRole("admin");
  const parsed = z.object({ batchId: BatchId }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (!statusLimiter.check(session.uid)) return { ok: false, error: "rate_limited" };
  const provider = getCheckoutProvider();
  if (!provider) return { ok: false, error: "unavailable" };
  const result = await cancelCheckout(getRepos(), provider, { ...parsed.data, orgId: session.orgId, now: new Date() });
  refresh();
  return result;
}

/** The stand-in checkout page's buttons: record the chosen outcome, then go back to payroll. */
export async function completeSimulatedCheckoutAction(formData: FormData): Promise<void> {
  const session = await requireRole("admin");
  const parsed = z
    .object({ batchId: BatchId, outcome: z.enum(["paid", "failed"]) })
    .safeParse({ batchId: formData.get("batchId"), outcome: formData.get("outcome") });
  const provider = getCheckoutProvider();
  if (!parsed.success || !provider || !statusLimiter.check(session.uid)) redirect("/a/payroll");
  const result = await completeSimulatedCheckout(getRepos(), provider, {
    ...parsed.data,
    orgId: session.orgId,
    now: new Date(),
  });
  refresh();
  redirect(result.ok ? `/a/payroll?m=${result.month}#payouts-title` : "/a/payroll");
}

export type AccountFormState = { ok?: boolean; error?: AccountInputError | "invalid" | "rate_limited" };

const AccountInput = z.object({
  workerId: z.string().max(40),
  holder: z.string().max(120),
  account: z.string().max(30),
  ifsc: z.string().max(20),
});

export async function savePayoutAccountAction(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const session = await requireRole("admin");
  if (!accountLimiter.check(session.uid)) return { error: "rate_limited" };
  const parsed = AccountInput.safeParse({
    workerId: formData.get("workerId"),
    holder: formData.get("holder"),
    account: formData.get("account"),
    ifsc: formData.get("ifsc"),
  });
  if (!parsed.success) return { error: "invalid" };
  const result = await savePayoutAccount(getRepos(), {
    ...parsed.data,
    orgId: session.orgId,
    adminId: session.uid,
    now: new Date(),
  });
  if (!result.ok) return { error: result.error };
  // Start Cashfree's check of the account now, after the response, so it is ready by the first
  // checkout. A failure here changes nothing: the checkout registers it again if needed.
  const provider = getCheckoutProvider();
  if (provider?.prepare) {
    const { workerId, holder, account, ifsc } = parsed.data;
    after(() =>
      provider.prepare!({
        workerId,
        holder: normaliseHolder(holder),
        account: normaliseAccount(account),
        ifsc: normaliseIfsc(ifsc),
      }).catch(() => undefined),
    );
  }
  revalidatePath("/a/payroll");
  return { ok: true };
}

/** The worker confirms or rejects a change to their own pay account (never anyone else's). */
export async function answerPayoutAccountAction(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const session = await requireRole("worker");
  const parsed = z.object({ confirm: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (!answerLimiter.check(session.uid)) return { ok: false, error: "rate_limited" };
  const result = await answerPayoutAccount(getRepos(), {
    workerId: session.uid,
    confirm: parsed.data.confirm,
    now: new Date(),
  });
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/w");
  revalidatePath("/w/pay");
  revalidatePath("/a/payroll");
  return { ok: true };
}
