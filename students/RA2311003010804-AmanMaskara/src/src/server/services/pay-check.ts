import { z } from "zod";
import { checkPay, outstandingShortfall, type PayCheckResult } from "@/core/pay-check";
import { parseCsv, rupeesToPaise } from "@/core/csv";
import { isMonthKey } from "@/core/period";
import { payLocks, type PayLock } from "@/core/payouts";
import { aboveDue, belowRecorded, recordedPay, recordLock } from "@/core/pay-entry";
import { findMinimumWage, type MinimumWageRate } from "@/config/minimum-wage";
import { buildPayslip, type PayslipView } from "@/server/services/payslip";
import type { PaidRecordEntry, Repos } from "@/server/repos/types";
import { withPayrollLock } from "./pay-lock";

export interface PayCheckView {
  view: PayslipView;
  record: PaidRecordEntry | undefined;
  result: PayCheckResult;
  minimumWage: MinimumWageRate;
  /** Arrears already paid for this month (paise) */
  arrearsPaid: number;
  /** The gap still owed after arrears (paise); 0 when nothing is owed */
  outstanding: number;
  /** Paise per hour the check used */
  rates: { regular: number; overtime: number };
}

/** Compare one worker's attendance-based payslip with what the employer recorded as paid. */
export async function payCheckFor(repos: Repos, workerId: string, month: string): Promise<PayCheckView | null> {
  const [view, record] = await Promise.all([
    buildPayslip(repos, workerId, month),
    repos.paidRecords.get(workerId, month),
  ]);
  if (!view) return null;
  const site = await repos.sites.getById(view.worker.siteId);
  return payCheckFrom(view, record, site?.state);
}

/** The pay check from already-loaded data (the payslip, the paid record and the site's state). */
export function payCheckFrom(
  view: PayslipView,
  record: PaidRecordEntry | undefined,
  siteState: string | undefined,
): PayCheckView {
  const minimumWage = findMinimumWage(siteState ?? "IN", view.org.sector, view.worker.skillLevel);
  const regular = view.payslip.lines.find((l) => l.kind === "regular");
  const overtime = view.payslip.lines.find((l) => l.kind === "overtime");
  const hourlyRate = regular?.rate ?? 0;

  const overtimeRate = overtime?.rate ?? Math.round(hourlyRate * view.org.labourRules.otMultiplier);
  const result = checkPay({
    attendance: { regularMinutes: regular?.minutes ?? 0, overtimeMinutes: overtime?.minutes ?? 0 },
    payRules: {
      hourlyRate,
      overtimeRate,
      expectedDeductions: view.payslip.deductions.reduce((sum, d) => sum + d.amount, 0),
      expected: { gross: view.payslip.gross, net: view.payslip.net },
    },
    paidRecord: record ?? null,
    minimumWage,
  });
  const arrearsPaid = (record?.arrears ?? []).reduce((sum, a) => sum + a.amount, 0);
  return {
    view,
    record,
    result,
    minimumWage,
    arrearsPaid,
    outstanding: outstandingShortfall(result, arrearsPaid),
    rates: { regular: hourlyRate, overtime: overtimeRate },
  };
}

// ── Recording what was paid (manual form or CSV) ──────────────────

/** Hours as decimals, money in paise. Zod keeps every number finite, non-negative and sane. */
export const PaidRecordInput = z
  .object({
    workerId: z.string().max(40),
    month: z.string().refine(isMonthKey),
    paidRegularHours: z.number().min(0).max(400),
    paidOvertimeHours: z.number().min(0).max(200),
    grossPaid: z.number().int().min(0).max(10_000_000_00),
    deductions: z.number().int().min(0).max(10_000_000_00),
    netPaid: z.number().int().min(0).max(10_000_000_00),
  })
  .refine((r) => r.netPaid <= r.grossPaid, { message: "net_above_gross" });
export type PaidRecordInput = z.infer<typeof PaidRecordInput>;

/** Who is paid, or being paid, through a checkout this month (see `payLocks`). */
export async function payLocksFor(repos: Repos, orgId: string, month: string): Promise<Map<string, PayLock>> {
  const batches = await repos.payoutBatches.getByOrgMonth(orgId, month);
  return payLocks(batches.flatMap((b) => b.items));
}

export type SavePaidError = "not_found" | "locked" | "settled" | "below_recorded" | "above_due" | "busy";
export type SavePaidResult = { ok: true } | { ok: false; error: SavePaidError };

/**
 * The employer records by hand (form or CSV) what they paid this month, in total. Refused when:
 * - a checkout paid this worker for the month, or one is waiting ("locked"): that payment is the record;
 * - the month is already paid in full, or its gap was paid as arrears ("settled");
 * - it pays less than is already recorded, in hours or money ("below_recorded"): pay can be added
 *   to, never taken back, or the reopened gap could be paid a second time;
 * - it pays more than the month owes ("above_due"): more than the net due, or more hours than worked.
 */
export async function savePaidRecord(
  repos: Repos,
  orgId: string,
  adminId: string,
  input: PaidRecordInput,
  now: Date,
): Promise<SavePaidResult> {
  const worker = await repos.workers.getById(input.workerId);
  if (!worker || worker.orgId !== orgId) return { ok: false, error: "not_found" };
  const result = await withPayrollLock(repos, orgId, input.month, async (): Promise<SavePaidResult> => {
    const [locks, check] = await Promise.all([
      payLocksFor(repos, orgId, input.month),
      payCheckFor(repos, input.workerId, input.month),
    ]);
    const lock = recordLock({
      hasRecord: Boolean(check?.record),
      outstanding: check?.outstanding ?? 0,
      arrearsPaid: check?.arrearsPaid ?? 0,
      checkout: locks.has(input.workerId),
    });
    if (lock) return { ok: false, error: lock === "checkout" ? "locked" : "settled" };
    if (check?.record && belowRecorded(recordedPay(input), recordedPay(check.record))) {
      return { ok: false, error: "below_recorded" };
    }
    if (check) {
      const { payslip } = check.view;
      const minutes = (kind: "regular" | "overtime") => payslip.lines.find((l) => l.kind === kind)?.minutes ?? 0;
      const due = { regularMinutes: minutes("regular"), overtimeMinutes: minutes("overtime"), net: payslip.net };
      if (aboveDue(recordedPay(input), due)) return { ok: false, error: "above_due" };
    }
    await writePaidRecord(repos, orgId, adminId, input, now);
    return { ok: true };
  });
  return result === "busy" ? { ok: false, error: "busy" } : result;
}

/**
 * Saves the month's pay record. Callers decide who may write it and hold the payroll lock: the
 * manual form and CSV through `savePaidRecord`, a paid checkout when it settles.
 */
export async function writePaidRecord(
  repos: Repos,
  orgId: string,
  adminId: string,
  input: PaidRecordInput,
  now: Date,
): Promise<void> {
  const existing = await repos.paidRecords.get(input.workerId, input.month);
  await repos.paidRecords.upsert({
    ...input,
    id: `${input.workerId}:${input.month}`,
    orgId,
    recordedAt: now,
    recordedBy: adminId,
    arrears: existing?.arrears,
  });
}

/**
 * The employer pays the gap. The amount is always the outstanding gap computed here, never a
 * number from the browser. The worker's open review for that month is resolved with it. Refused
 * while a checkout for this worker is open, and done under the payroll lock so a double tap
 * records it once.
 */
export async function payArrears(
  repos: Repos,
  input: { orgId: string; adminId: string; workerId: string; month: string; now: Date },
): Promise<{ ok: true; amount: number } | { ok: false; error: "not_found" | "nothing_owed" | "in_progress" | "busy" }> {
  const worker = await repos.workers.getById(input.workerId);
  if (!worker || worker.orgId !== input.orgId) return { ok: false, error: "not_found" };
  const result = await withPayrollLock(repos, input.orgId, input.month, async () => {
    // A checkout for this worker is still open: settling the gap here too would pay it twice.
    const locks = await payLocksFor(repos, input.orgId, input.month);
    if (locks.get(input.workerId) === "waiting") return { ok: false as const, error: "in_progress" as const };
    const check = await payCheckFor(repos, input.workerId, input.month);
    if (!check?.record || check.outstanding === 0) return { ok: false as const, error: "nothing_owed" as const };
    const amount = check.outstanding;
    await recordArrears(repos, check.record, { ...input, amount });
    return { ok: true as const, amount };
  });
  return result === "busy" ? { ok: false, error: "busy" } : result;
}

/** Adds an arrears payment to a pay record and closes the worker's open reviews for that month. */
export async function recordArrears(
  repos: Repos,
  record: PaidRecordEntry,
  input: { adminId: string; workerId: string; month: string; amount: number; now: Date },
): Promise<void> {
  await repos.paidRecords.upsert({
    ...record,
    arrears: [...(record.arrears ?? []), { amount: input.amount, at: input.now, by: input.adminId }],
  });
  const disputes = await repos.payDisputes.getByWorker(input.workerId);
  await Promise.all(
    disputes
      .filter((d) => d.month === input.month && d.status !== "resolved")
      .map((d) =>
        repos.payDisputes.update(d.id, { status: "resolved", settledAmount: input.amount, updatedAt: input.now }),
      ),
  );
}

export const PAID_CSV_HEADER = [
  "code",
  "month",
  "paidRegularHours",
  "paidOvertimeHours",
  "grossPaidINR",
  "deductionsINR",
  "netPaidINR",
] as const;
export const MAX_CSV_ROWS = 500;

export interface CsvImportResult {
  saved: number;
  /** 1-based data row numbers that were rejected, with a short reason key */
  errors: { row: number; reason: "columns" | "unknown_worker" | "invalid" | Exclude<SavePaidError, "not_found"> }[];
}

/**
 * Import a paid-records sheet. Every row is validated on its own; bad rows are reported, never
 * guessed. Each row follows the same rules as the form (see `savePaidRecord`).
 */
export async function importPaidCsv(
  repos: Repos,
  orgId: string,
  adminId: string,
  csv: string,
  now: Date,
): Promise<CsvImportResult> {
  const [header, ...rows] = parseCsv(csv);
  const result: CsvImportResult = { saved: 0, errors: [] };
  if (!header || header.map((h) => h.trim()).join(",") !== PAID_CSV_HEADER.join(",")) {
    return { saved: 0, errors: [{ row: 0, reason: "columns" }] };
  }
  const workers = new Map((await repos.workers.getByOrg(orgId)).map((w) => [w.code, w]));
  for (const [index, cells] of rows.slice(0, MAX_CSV_ROWS).entries()) {
    const row = index + 1;
    if (cells.length !== PAID_CSV_HEADER.length) {
      result.errors.push({ row, reason: "columns" });
      continue;
    }
    const [code, month, regular, overtime, gross, deductions, net] = cells.map((c) => c.trim());
    const worker = workers.get(code);
    if (!worker) {
      result.errors.push({ row, reason: "unknown_worker" });
      continue;
    }
    const parsed = PaidRecordInput.safeParse({
      workerId: worker.id,
      month,
      paidRegularHours: Number(regular),
      paidOvertimeHours: Number(overtime),
      grossPaid: rupeesToPaise(gross),
      deductions: rupeesToPaise(deductions),
      netPaid: rupeesToPaise(net),
    });
    if (!parsed.success) {
      result.errors.push({ row, reason: "invalid" });
      continue;
    }
    const saved = await savePaidRecord(repos, orgId, adminId, parsed.data, now);
    if (!saved.ok) {
      result.errors.push({ row, reason: saved.error === "not_found" ? "unknown_worker" : saved.error });
      continue;
    }
    result.saved++;
  }
  return result;
}
