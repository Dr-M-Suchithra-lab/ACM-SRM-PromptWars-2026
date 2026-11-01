import {
  accountUsable,
  batchIdFor,
  isValidAccount,
  isValidHolder,
  isValidIfsc,
  MAX_BATCH,
  normaliseAccount,
  normaliseHolder,
  normaliseIfsc,
  payableFor,
  payLocks,
  summariseBatch,
  transferIdFor,
  usableFrom,
  type PayLock,
  type PayoutAccountStatus,
  type PayoutFailure,
  type PayoutKind,
  type PayoutStatus,
} from "@/core/payouts";
import { decryptAccount, encryptAccount } from "@/server/bank-crypto";
import type { CheckoutProvider } from "@/server/payouts/provider";
import { createSimulatedCheckout } from "@/server/payouts/simulated";
import type { PayoutAccount, PayoutAccountEvent, PayoutBatch, PayoutItem, Repos } from "@/server/repos/types";
import { buildPayroll, type PayrollRow } from "./payroll";
import { recordArrears, writePaidRecord } from "./pay-check";
import { withPayrollLock } from "./pay-lock";

/** What the dashboard may see of a bank account: never the full number. */
export interface MaskedAccount {
  holder: string;
  masked: string;
  ifsc: string;
  status: PayoutAccountStatus;
  /** A checkout may pay into it now (confirmed, or the 48-hour wait for the worker is over) */
  usable: boolean;
  /** While waiting for the worker: when it becomes payable without their answer */
  usableFrom: Date | null;
  history: PayoutAccountEvent[];
}

export interface PayableWorker {
  workerId: string;
  name: string;
  code: string;
  kind: PayoutKind;
  /** Paise */
  amount: number;
  account: MaskedAccount | null;
  /** A checkout including this worker for this month is still waiting to be paid */
  busy: boolean;
}

export interface PayoutBatchView {
  id: string;
  provider: PayoutBatch["provider"];
  createdAt: Date;
  /** Set while the checkout is waiting, so the employer can go back and pay */
  checkoutUrl?: string;
  items: Omit<PayoutItem, "payslip" | "recordedAt">[];
  summary: ReturnType<typeof summariseBatch>;
}

export interface PayoutOverview {
  payable: PayableWorker[];
  /** Every worker, with their account if one is on file (for the bank details form) */
  accounts: { workerId: string; name: string; code: string; account: MaskedAccount | null }[];
  batches: PayoutBatchView[];
  /** Workers paid, or being paid, through a checkout this month: their pay record can't be typed over */
  locks: Record<string, PayLock>;
}

/** Checkouts shown for a month: any still waiting, and the latest finished ones. */
const RECENT_CHECKOUTS = 10;

/** Events kept per account, newest first. */
const HISTORY_LIMIT = 20;

const maskLast4 = (last4: string) => `••••${last4}`;

const mask = (a: PayoutAccount, now: Date): MaskedAccount => ({
  holder: a.holder,
  masked: maskLast4(a.last4),
  ifsc: a.ifsc,
  status: a.status,
  usable: accountUsable(a, now),
  usableFrom: a.status === "pending_worker" ? usableFrom(a.changedAt) : null,
  history: a.history,
});

const waiting = (batch: PayoutBatch) => batch.items.some((i) => i.status === "pending");

function batchView(batch: PayoutBatch): PayoutBatchView {
  return {
    id: batch.id,
    provider: batch.provider,
    createdAt: batch.createdAt,
    ...(waiting(batch) && batch.checkoutUrl ? { checkoutUrl: batch.checkoutUrl } : {}),
    items: batch.items.map(({ payslip, recordedAt, ...item }) => {
      void payslip;
      void recordedAt;
      return item;
    }),
    summary: summariseBatch(batch.items),
  };
}

const locksOf = (batches: PayoutBatch[]) => payLocks(batches.flatMap((b) => b.items));

const busyWorkers = (locks: Map<string, PayLock>) =>
  new Set([...locks].filter(([, lock]) => lock === "waiting").map(([workerId]) => workerId));

/**
 * Who can be paid this month and how much, the bank details on file, and recent checkouts.
 * Pass the payroll the page already builds so it is computed once.
 */
export async function payoutOverview(
  repos: Repos,
  orgId: string,
  month: string,
  payroll?: PayrollRow[] | Promise<PayrollRow[]>,
  now: Date = new Date(),
): Promise<PayoutOverview> {
  const [rows, accounts, batches] = await Promise.all([
    payroll ?? buildPayroll(repos, orgId, month),
    repos.payoutAccounts.getByOrg(orgId),
    repos.payoutBatches.getByOrgMonth(orgId, month),
  ]);
  const accountOf = new Map(accounts.map((a) => [a.id, mask(a, now)]));
  const locks = locksOf(batches);
  const busy = busyWorkers(locks);
  const payable = rows.flatMap((row) => {
    const due = payableFor({ net: row.net, outstanding: row.outstanding, hasRecord: Boolean(row.paid) });
    if (!due) return [];
    return [
      {
        workerId: row.workerId,
        name: row.name,
        code: row.code,
        ...due,
        account: accountOf.get(row.workerId) ?? null,
        busy: busy.has(row.workerId),
      },
    ];
  });
  return {
    payable,
    accounts: rows.map((r) => ({
      workerId: r.workerId,
      name: r.name,
      code: r.code,
      account: accountOf.get(r.workerId) ?? null,
    })),
    batches: batches
      .toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, RECENT_CHECKOUTS)
      .map(batchView),
    locks: Object.fromEntries(locks),
  };
}

export type PayRejection = "not_found" | "nothing_owed" | "no_account" | "account_unconfirmed" | "in_progress";

export type StartCheckoutResult =
  | { ok: true; batchId: string; url: string }
  | { ok: false; error: "invalid" | "busy" }
  | { ok: false; error: "rejected"; rejected: { workerId: string; reason: PayRejection }[] }
  | { ok: false; error: "checkout_failed"; detail: string };

/**
 * Opens one checkout for the chosen workers: the employer pays the total once and each worker's
 * share goes to their bank account. Every amount is this month's payroll as computed here; the
 * browser only says who. The whole batch is refused if any worker can't be paid.
 */
export async function startCheckout(
  repos: Repos,
  provider: CheckoutProvider,
  input: {
    orgId: string;
    adminId: string;
    month: string;
    workerIds: string[];
    randomHex: string;
    /** This deployment's public origin, for the return link */
    origin: string;
    now: Date;
  },
): Promise<StartCheckoutResult> {
  const ids = [...new Set(input.workerIds)];
  if (ids.length === 0 || ids.length > MAX_BATCH) return { ok: false, error: "invalid" };

  // Who can be paid is checked and the checkout saved as one step, under the payroll lock: two
  // checkouts opened at the same moment can't both claim a worker.
  const claimed = await withPayrollLock(repos, input.orgId, input.month, async () => {
    const [rows, accounts, batches, admin] = await Promise.all([
      buildPayroll(repos, input.orgId, input.month),
      repos.payoutAccounts.getByOrg(input.orgId),
      repos.payoutBatches.getByOrgMonth(input.orgId, input.month),
      repos.admins.getById(input.adminId),
    ]);
    const rowOf = new Map(rows.map((r) => [r.workerId, r]));
    const accountOf = new Map(accounts.map((a) => [a.id, a]));
    const busy = busyWorkers(locksOf(batches));

    const rejected: { workerId: string; reason: PayRejection }[] = [];
    const chosen: { row: PayrollRow; kind: PayoutKind; amount: number }[] = [];
    for (const workerId of ids) {
      const row = rowOf.get(workerId);
      const due = row && payableFor({ net: row.net, outstanding: row.outstanding, hasRecord: Boolean(row.paid) });
      if (!row) rejected.push({ workerId, reason: "not_found" });
      else if (!due) rejected.push({ workerId, reason: "nothing_owed" });
      else if (!accountOf.has(workerId)) rejected.push({ workerId, reason: "no_account" });
      else if (!accountUsable(accountOf.get(workerId)!, input.now)) {
        rejected.push({ workerId, reason: "account_unconfirmed" });
      } else if (busy.has(workerId)) rejected.push({ workerId, reason: "in_progress" });
      else chosen.push({ row, ...due });
    }
    if (rejected.length) return { ok: false as const, rejected };

    const batchId = batchIdFor(input.month, input.randomHex);
    const batch: PayoutBatch = {
      id: batchId,
      orgId: input.orgId,
      month: input.month,
      provider: provider.name,
      createdAt: input.now,
      createdBy: input.adminId,
      updatedAt: input.now,
      items: chosen.map(({ row, kind, amount }, index) => {
        const account = accountOf.get(row.workerId)!;
        return {
          transferId: transferIdFor(batchId, index),
          workerId: row.workerId,
          name: row.name,
          kind,
          amount,
          accountMasked: maskLast4(account.last4),
          ifsc: account.ifsc,
          status: "pending",
          payslip: {
            regularMinutes: row.regularMinutes,
            overtimeMinutes: row.overtimeMinutes,
            gross: row.gross,
            deductions: row.deductions,
          },
        };
      }),
    };
    // Saved before the checkout opens: these workers can't be put in a second checkout meanwhile.
    await repos.payoutBatches.create(batch);
    return { ok: true as const, batch, accountOf, admin };
  });
  if (claimed === "busy") return { ok: false, error: "busy" };
  if (!claimed.ok) return { ok: false, error: "rejected", rejected: claimed.rejected };
  const { batch, accountOf, admin } = claimed;
  const batchId = batch.id;

  try {
    const { url } = await provider.create({
      batchId,
      amount: batch.items.reduce((sum, i) => sum + i.amount, 0),
      purpose: `FairShift wages ${input.month} (${batch.items.length} workers)`,
      returnUrl: `${input.origin}/api/checkout/return?batch=${batchId}`,
      payer: { id: input.adminId, name: admin?.name ?? "Employer" },
      // The only place a full account number is decrypted: on its way to the payment provider.
      splits: batch.items.map((item) => {
        const account = accountOf.get(item.workerId)!;
        return {
          workerId: item.workerId,
          holder: account.holder,
          account: decryptAccount(account.accountEncrypted, item.workerId),
          ifsc: account.ifsc,
          amount: item.amount,
        };
      }),
    });
    await repos.payoutBatches.update(batchId, { checkoutUrl: url, updatedAt: input.now });
    return { ok: true, batchId, url };
  } catch (error) {
    // The checkout never opened, so nothing can be paid: free these workers again.
    const detail = error instanceof Error ? error.message.slice(0, 120) : "unknown error";
    await settle(repos, batch, "failed", input.now, { failure: "checkout_failed", detail });
    return { ok: false, error: "checkout_failed", detail };
  }
}

/** Asks the provider whether a waiting checkout was paid, and records the outcome. */
export async function confirmCheckout(
  repos: Repos,
  provider: CheckoutProvider,
  input: { orgId: string; batchId: string; now: Date },
): Promise<{ ok: true; batch: PayoutBatchView; month: string } | { ok: false; error: "not_found" | "unavailable" }> {
  const batch = await repos.payoutBatches.getById(input.batchId);
  if (!batch || batch.orgId !== input.orgId) return { ok: false, error: "not_found" };
  if (!waiting(batch)) return { ok: true, batch: batchView(batch), month: batch.month };
  const owner = providerFor(repos, batch, provider);
  if (!owner) return { ok: false, error: "unavailable" };
  let status: PayoutStatus;
  try {
    status = await owner.status(batch.id);
  } catch {
    return { ok: false, error: "unavailable" };
  }
  const next =
    status === "pending" ? batch : await settle(repos, batch, status, input.now, { failure: "payment_failed" });
  if (next === "busy") return { ok: false, error: "unavailable" };
  return { ok: true, batch: batchView(next), month: batch.month };
}

/** The employer gives up on a waiting checkout: the link is cancelled and the workers are freed. */
export async function cancelCheckout(
  repos: Repos,
  provider: CheckoutProvider,
  input: { orgId: string; batchId: string; now: Date },
): Promise<{ ok: true } | { ok: false; error: "not_found" | "unavailable" }> {
  const batch = await repos.payoutBatches.getById(input.batchId);
  if (!batch || batch.orgId !== input.orgId) return { ok: false, error: "not_found" };
  if (!waiting(batch)) return { ok: true };
  // If it was paid in the meantime, record that instead of cancelling.
  const confirmed = await confirmCheckout(repos, provider, input);
  if (!confirmed.ok) return confirmed;
  if (confirmed.batch.summary.pending === 0) return { ok: true };
  const owner = providerFor(repos, batch, provider);
  if (!owner) return { ok: false, error: "unavailable" };
  try {
    await owner.cancel(batch.id);
  } catch {
    return { ok: false, error: "unavailable" };
  }
  const settled = await settle(repos, batch, "failed", input.now, { failure: "payment_cancelled" });
  return settled === "busy" ? { ok: false, error: "unavailable" } : { ok: true };
}

/** Simulation only: the employer chose the outcome on the stand-in checkout page. */
export async function completeSimulatedCheckout(
  repos: Repos,
  provider: CheckoutProvider,
  input: { orgId: string; batchId: string; outcome: "paid" | "failed"; now: Date },
): Promise<{ ok: true; month: string } | { ok: false; error: "not_found" | "unavailable" }> {
  const batch = await repos.payoutBatches.getById(input.batchId);
  if (!batch || batch.orgId !== input.orgId || batch.provider !== "simulated" || provider.name !== "simulated") {
    return { ok: false, error: "not_found" };
  }
  if (waiting(batch)) await repos.payoutBatches.update(batch.id, { simulatedStatus: input.outcome });
  const confirmed = await confirmCheckout(repos, provider, input);
  return confirmed.ok ? { ok: true, month: confirmed.month } : confirmed;
}

/** The checkout page for a waiting batch of this organisation (simulation shows it; Cashfree hosts its own). */
export async function waitingCheckout(repos: Repos, orgId: string, batchId: string): Promise<PayoutBatchView | null> {
  const batch = await repos.payoutBatches.getById(batchId);
  if (!batch || batch.orgId !== orgId || !waiting(batch)) return null;
  return batchView(batch);
}

/**
 * Gives every waiting share the checkout's outcome, and writes each newly paid one to the
 * worker's pay record exactly once. A share that is already paid or failed never changes. Runs
 * under the payroll lock on a fresh copy of the batch, so the return link and a "Check status"
 * arriving together can't record the same payment twice.
 */
async function settle(
  repos: Repos,
  batch: PayoutBatch,
  status: Exclude<PayoutStatus, "pending">,
  now: Date,
  why: { failure: PayoutFailure; detail?: string },
): Promise<PayoutBatch | "busy"> {
  return withPayrollLock(repos, batch.orgId, batch.month, async () => {
    const current = (await repos.payoutBatches.getById(batch.id)) ?? batch;
    if (!waiting(current)) return current;
    const items: PayoutItem[] = [];
    for (const item of current.items) {
      if (item.status !== "pending") {
        items.push(item);
        continue;
      }
      if (status === "failed") {
        items.push({ ...item, status, failure: why.failure, ...(why.detail ? { detail: why.detail } : {}) });
        continue;
      }
      if (!item.recordedAt) await recordPayment(repos, current, item, now);
      items.push({ ...item, status, recordedAt: item.recordedAt ?? now });
    }
    await repos.payoutBatches.update(current.id, { items, updatedAt: now });
    return { ...current, items, updatedAt: now };
  });
}

/**
 * The provider that opened a checkout is the one asked about it: a simulated checkout is still
 * answered by the simulation after Cashfree keys are added. null when it can't be reached.
 */
function providerFor(repos: Repos, batch: PayoutBatch, current: CheckoutProvider): CheckoutProvider | null {
  if (batch.provider === current.name) return current;
  return batch.provider === "simulated" ? createSimulatedCheckout(repos) : null;
}

/** A paid month's pay becomes the month's pay record; a paid gap is added to it as arrears. */
async function recordPayment(repos: Repos, batch: PayoutBatch, item: PayoutItem, now: Date): Promise<void> {
  const existing = await repos.paidRecords.get(item.workerId, batch.month);
  if (item.kind === "gap" && existing) {
    await recordArrears(repos, existing, {
      adminId: batch.createdBy,
      workerId: item.workerId,
      month: batch.month,
      amount: item.amount,
      now,
    });
    return;
  }
  await writePaidRecord(
    repos,
    batch.orgId,
    batch.createdBy,
    {
      workerId: item.workerId,
      month: batch.month,
      paidRegularHours: item.payslip.regularMinutes / 60,
      paidOvertimeHours: item.payslip.overtimeMinutes / 60,
      grossPaid: item.payslip.gross,
      deductions: item.payslip.deductions,
      netPaid: item.amount,
    },
    now,
  );
}

// ── Bank details ──────────────────────────────────────────────────

export type AccountInputError = "holder" | "account" | "ifsc" | "not_found";

const withEvent = (history: PayoutAccountEvent[], event: PayoutAccountEvent) =>
  [event, ...history].slice(0, HISTORY_LIMIT);

/**
 * The employer saves where a worker's share is settled. Formats and the worker's organisation are
 * checked, the number is stored encrypted, and any change waits for the worker to confirm it.
 * Saving the same details again changes nothing, unless the worker had said they are not theirs.
 */
export async function savePayoutAccount(
  repos: Repos,
  input: { orgId: string; adminId: string; workerId: string; holder: string; account: string; ifsc: string; now: Date },
): Promise<{ ok: true; account: MaskedAccount } | { ok: false; error: AccountInputError }> {
  const holder = normaliseHolder(input.holder);
  const account = normaliseAccount(input.account);
  const ifsc = normaliseIfsc(input.ifsc);
  if (!isValidHolder(holder)) return { ok: false, error: "holder" };
  if (!isValidAccount(account)) return { ok: false, error: "account" };
  if (!isValidIfsc(ifsc)) return { ok: false, error: "ifsc" };
  const worker = await repos.workers.getById(input.workerId);
  if (!worker || worker.orgId !== input.orgId) return { ok: false, error: "not_found" };

  const existing = await repos.payoutAccounts.get(worker.id);
  // Saving the same details changes nothing, except after the worker said "this isn't my
  // account": entering it again asks them again (they may have tapped "No" by mistake).
  if (existing && existing.status !== "disputed" && sameDetails(existing, { holder, account, ifsc })) {
    return { ok: true, account: mask(existing, input.now) };
  }
  const saved: PayoutAccount = {
    id: worker.id,
    orgId: worker.orgId,
    holder,
    accountEncrypted: encryptAccount(account, worker.id),
    last4: account.slice(-4),
    ifsc,
    status: "pending_worker",
    changedAt: input.now,
    updatedAt: input.now,
    updatedBy: input.adminId,
    history: withEvent(existing?.history ?? [], {
      at: input.now,
      by: "employer",
      action: "changed",
      last4: account.slice(-4),
    }),
  };
  await repos.payoutAccounts.upsert(saved);
  return { ok: true, account: mask(saved, input.now) };
}

function sameDetails(existing: PayoutAccount, next: { holder: string; account: string; ifsc: string }): boolean {
  if (existing.holder !== next.holder || existing.ifsc !== next.ifsc || existing.last4 !== next.account.slice(-4)) {
    return false;
  }
  try {
    return decryptAccount(existing.accountEncrypted, existing.id) === next.account;
  } catch {
    return false; // unreadable (e.g. an old key): save it again
  }
}

/** What a worker sees of their own pay account: masked, with whether it waits for their answer. */
export interface WorkerPayoutAccount {
  masked: string;
  ifsc: string;
  holder: string;
  status: PayoutAccountStatus;
  changedAt: Date;
  usableFrom: Date | null;
}

export async function workerPayoutAccount(repos: Repos, workerId: string): Promise<WorkerPayoutAccount | null> {
  const account = await repos.payoutAccounts.get(workerId);
  if (!account) return null;
  return {
    masked: maskLast4(account.last4),
    ifsc: account.ifsc,
    holder: account.holder,
    status: account.status,
    changedAt: account.changedAt,
    usableFrom: account.status === "pending_worker" ? usableFrom(account.changedAt) : null,
  };
}

/**
 * The worker answers about a change to their own pay account: "yes, it's mine" makes it payable at
 * once; "this isn't my account" blocks it until the employer enters it again. Only the worker can
 * answer, only for their own account, and only while a change is waiting.
 */
export async function answerPayoutAccount(
  repos: Repos,
  input: { workerId: string; confirm: boolean; now: Date },
): Promise<{ ok: true; status: PayoutAccountStatus } | { ok: false; error: "not_found" | "nothing_to_confirm" }> {
  const account = await repos.payoutAccounts.get(input.workerId);
  if (!account) return { ok: false, error: "not_found" };
  if (account.status !== "pending_worker") return { ok: false, error: "nothing_to_confirm" };
  const status: PayoutAccountStatus = input.confirm ? "confirmed" : "disputed";
  await repos.payoutAccounts.upsert({
    ...account,
    status,
    updatedAt: input.now,
    history: withEvent(account.history, {
      at: input.now,
      by: "worker",
      action: input.confirm ? "confirmed" : "disputed",
      last4: account.last4,
    }),
  });
  return { ok: true, status };
}
