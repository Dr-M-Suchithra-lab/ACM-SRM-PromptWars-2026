/**
 * Paying several workers through one checkout: what each worker can be paid, bank detail checks,
 * and batch bookkeeping. Pure functions only. Amounts are always in paise and always come from
 * payroll, never from a form.
 */

export type PayoutKind = "salary" | "gap";
export type PayoutStatus = "pending" | "paid" | "failed";
/** Why a batch was not paid: the payment failed or was abandoned, or the checkout could not be opened. */
export type PayoutFailure = "payment_failed" | "payment_cancelled" | "checkout_failed";

/** Most workers one checkout may pay: enough for a crew, small enough to review before paying. */
export const MAX_BATCH = 25;
/** The smallest amount a payment link or split can carry is ₹1. */
export const MIN_PAYOUT = 100;

/**
 * What a worker can be paid for a month:
 * - nothing recorded yet → their whole net pay ("salary")
 * - a record with a possible shortfall still open → exactly that gap ("gap")
 */
export function payableFor(row: {
  net: number;
  outstanding: number;
  hasRecord: boolean;
}): { kind: PayoutKind; amount: number } | null {
  if (!row.hasRecord) return row.net >= MIN_PAYOUT ? { kind: "salary", amount: row.net } : null;
  return row.outstanding >= MIN_PAYOUT ? { kind: "gap", amount: row.outstanding } : null;
}

/** "waiting": a checkout with this worker's share is open. "paid": a checkout paid them this month. */
export type PayLock = "waiting" | "paid";

/**
 * Workers whose month goes through a FairShift checkout. Their pay record is the payment itself,
 * so a hand-typed record or CSV row can't replace it (which would reopen a gap and pay them twice).
 * A failed share locks nothing. Waiting wins over paid: nothing more may be paid until it settles.
 */
export function payLocks(items: { workerId: string; status: PayoutStatus }[]): Map<string, PayLock> {
  const locks = new Map<string, PayLock>();
  for (const item of items) {
    if (item.status === "pending") locks.set(item.workerId, "waiting");
    else if (item.status === "paid" && !locks.has(item.workerId)) locks.set(item.workerId, "paid");
  }
  return locks;
}

// ── Bank details ───────────────────────────────────────────────────

/** Indian IFSC: 4 bank letters, a zero, then 6 letters or digits (RBI format). */
const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;
/** Bank account numbers are 9 to 18 digits. */
const ACCOUNT = /^\d{9,18}$/;
/** Letters in any script, spaces, dots, apostrophes and hyphens. */
const HOLDER = /^[\p{L}\p{M}][\p{L}\p{M} .'-]{1,99}$/u;

export const normaliseIfsc = (ifsc: string) => ifsc.trim().toUpperCase();
export const normaliseAccount = (account: string) => account.replace(/[\s-]/g, "");
export const normaliseHolder = (holder: string) => holder.trim().replace(/\s+/g, " ");

export const isValidIfsc = (ifsc: string) => IFSC.test(ifsc);
export const isValidAccount = (account: string) => ACCOUNT.test(account);
export const isValidHolder = (holder: string) => HOLDER.test(holder);

/** Only the last four digits ever leave the server: "••••1191". */
export function maskAccount(account: string): string {
  return `••••${account.slice(-4)}`;
}

// ── Bank detail changes ───────────────────────────────────────────

/**
 * Bank details entered or changed by the employer wait for the worker to confirm them in their
 * app ("pending_worker"); a worker who says "this isn't my account" blocks it ("disputed") until
 * the employer enters it again.
 */
export type PayoutAccountStatus = "confirmed" | "pending_worker" | "disputed";

/**
 * A changed account the worker hasn't answered about can still be paid after 48 hours, so a worker
 * who rarely opens the app is never left unpaid. Long enough for them to see the change and object.
 */
export const BANK_CHANGE_COOLING_OFF_MS = 48 * 60 * 60 * 1000;

/** Whether a checkout may pay into this account now. */
export function accountUsable(account: { status: PayoutAccountStatus; changedAt: Date }, now: Date): boolean {
  if (account.status === "confirmed") return true;
  if (account.status === "disputed") return false;
  return now.getTime() - account.changedAt.getTime() >= BANK_CHANGE_COOLING_OFF_MS;
}

/** When a waiting change can be paid without the worker's answer. */
export const usableFrom = (changedAt: Date) => new Date(changedAt.getTime() + BANK_CHANGE_COOLING_OFF_MS);

// ── Batch bookkeeping ─────────────────────────────────────────────

/** Provider ids allow letters, digits and underscores only: "fs202610_a1b2c3d4e5f6". */
export function batchIdFor(month: string, randomHex: string): string {
  return `fs${month.replace("-", "")}_${randomHex.replace(/[^a-f0-9]/gi, "").slice(0, 12)}`;
}

export const transferIdFor = (batchId: string, index: number) => `${batchId}_${index + 1}`;

/**
 * Maps a payment link's status to ours. Only PAID is paid; a link that expired or was cancelled
 * will never be paid; anything else (ACTIVE, PARTIALLY_PAID) is still waiting.
 */
export function mapLinkStatus(status: string): PayoutStatus {
  const s = status.toUpperCase();
  if (s === "PAID") return "paid";
  if (["EXPIRED", "CANCELLED", "TERMINATED"].includes(s)) return "failed";
  return "pending";
}

export function summariseBatch(items: { status: PayoutStatus; amount: number }[]): {
  paid: number;
  failed: number;
  pending: number;
  paidAmount: number;
} {
  return items.reduce(
    (sum, item) => ({
      paid: sum.paid + (item.status === "paid" ? 1 : 0),
      failed: sum.failed + (item.status === "failed" ? 1 : 0),
      pending: sum.pending + (item.status === "pending" ? 1 : 0),
      paidAmount: sum.paidAmount + (item.status === "paid" ? item.amount : 0),
    }),
    { paid: 0, failed: 0, pending: 0, paidAmount: 0 },
  );
}

/** Paise as the rupee number payment APIs expect (two decimals). */
export const paiseToRupees = (paise: number) => Math.round(paise) / 100;
