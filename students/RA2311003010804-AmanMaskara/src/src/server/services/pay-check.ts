import { z } from "zod";
import { checkPay, outstandingShortfall, type PayCheckResult } from "@/core/pay-check";
import { parseCsv, rupeesToPaise } from "@/core/csv";
import { isMonthKey } from "@/core/period";
import { findMinimumWage, type MinimumWageRate } from "@/config/minimum-wage";
import { buildPayslip, type PayslipView } from "@/server/services/payslip";
import type { PaidRecordEntry, Repos } from "@/server/repos/types";

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

export async function savePaidRecord(
  repos: Repos,
  orgId: string,
  adminId: string,
  input: PaidRecordInput,
  now: Date,
): Promise<boolean> {
  const worker = await repos.workers.getById(input.workerId);
  if (!worker || worker.orgId !== orgId) return false;
  // Arrears are separate payments: a corrected record keeps them.
  const existing = await repos.paidRecords.get(input.workerId, input.month);
  await repos.paidRecords.upsert({
    ...input,
    id: `${input.workerId}:${input.month}`,
    orgId,
    recordedAt: now,
    recordedBy: adminId,
    arrears: existing?.arrears,
  });
  return true;
}

/**
 * The employer pays the gap. The amount is always the outstanding gap computed here, never a
 * number from the browser. The worker's open review for that month is resolved with it.
 */
export async function payArrears(
  repos: Repos,
  input: { orgId: string; adminId: string; workerId: string; month: string; now: Date },
): Promise<{ ok: true; amount: number } | { ok: false; error: "not_found" | "nothing_owed" }> {
  const worker = await repos.workers.getById(input.workerId);
  if (!worker || worker.orgId !== input.orgId) return { ok: false, error: "not_found" };
  const check = await payCheckFor(repos, input.workerId, input.month);
  if (!check?.record || check.outstanding === 0) return { ok: false, error: "nothing_owed" };
  const amount = check.outstanding;
  await repos.paidRecords.upsert({
    ...check.record,
    arrears: [...(check.record.arrears ?? []), { amount, at: input.now, by: input.adminId }],
  });
  const disputes = await repos.payDisputes.getByWorker(input.workerId);
  await Promise.all(
    disputes
      .filter((d) => d.month === input.month && d.status !== "resolved")
      .map((d) => repos.payDisputes.update(d.id, { status: "resolved", settledAmount: amount, updatedAt: input.now })),
  );
  return { ok: true, amount };
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
  errors: { row: number; reason: "columns" | "unknown_worker" | "invalid" }[];
}

/** Import a paid-records sheet. Every row is validated on its own; bad rows are reported, never guessed. */
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
    await savePaidRecord(repos, orgId, adminId, parsed.data, now);
    result.saved++;
  }
  return result;
}
