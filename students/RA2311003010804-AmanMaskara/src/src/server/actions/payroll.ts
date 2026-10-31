"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { RateLimiter } from "@/server/rate-limit";
import {
  importPaidCsv,
  PaidRecordInput,
  payArrears,
  savePaidRecord,
  type CsvImportResult,
} from "@/server/services/pay-check";
import { updateDispute } from "@/server/services/disputes";
import { rupeesToPaise } from "@/core/csv";
import { isMonthKey } from "@/core/period";
import { Note } from "@/server/validation";

const MAX_CSV_BYTES = 100 * 1024;
const importLimiter = new RateLimiter({ maxTokens: 10, refillIntervalMs: 10 * 60 * 1000 });

export type PaidFormState = { ok?: boolean; error?: "invalid" | "unknown_worker" | "rate_limited" };

const saveLimiter = new RateLimiter({ maxTokens: 60, refillIntervalMs: 60 * 60 * 1000 });

function refresh(): void {
  revalidatePath("/a/payroll");
  revalidatePath("/a");
  revalidatePath("/w/pay");
}

/** Manual entry of what was actually paid. Money is typed in rupees and stored in paise. */
export async function savePaidRecordAction(_prev: PaidFormState, formData: FormData): Promise<PaidFormState> {
  const session = await requireRole("admin");
  if (!saveLimiter.check(session.uid)) return { error: "rate_limited" };
  const parsed = PaidRecordInput.safeParse({
    workerId: formData.get("workerId"),
    month: formData.get("month"),
    paidRegularHours: Number(formData.get("paidRegularHours")),
    paidOvertimeHours: Number(formData.get("paidOvertimeHours")),
    grossPaid: rupeesToPaise(String(formData.get("grossPaid") ?? "")),
    deductions: rupeesToPaise(String(formData.get("deductions") ?? "")),
    netPaid: rupeesToPaise(String(formData.get("netPaid") ?? "")),
  });
  if (!parsed.success) return { error: "invalid" };
  const saved = await savePaidRecord(getRepos(), session.orgId, session.uid, parsed.data, new Date());
  if (!saved) return { error: "unknown_worker" };
  refresh();
  return { ok: true };
}

export type CsvFormState = { result?: CsvImportResult; error?: "file" | "rate_limited" };

export async function importPaidCsvAction(_prev: CsvFormState, formData: FormData): Promise<CsvFormState> {
  const session = await requireRole("admin");
  if (!importLimiter.check(session.uid)) return { error: "rate_limited" };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_CSV_BYTES) return { error: "file" };
  const result = await importPaidCsv(getRepos(), session.orgId, session.uid, await file.text(), new Date());
  refresh();
  return { result };
}

const Arrears = z.object({ workerId: z.string().max(40), month: z.string().refine(isMonthKey) });
const arrearsLimiter = new RateLimiter({ maxTokens: 30, refillIntervalMs: 60 * 60 * 1000 });

/** "Pay the gap": records an arrears payment of exactly the outstanding shortfall. */
export async function payArrearsAction(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const session = await requireRole("admin");
  const parsed = Arrears.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (!arrearsLimiter.check(session.uid)) return { ok: false, error: "rate_limited" };
  const result = await payArrears(getRepos(), {
    ...parsed.data,
    orgId: session.orgId,
    adminId: session.uid,
    now: new Date(),
  });
  if (!result.ok) return { ok: false, error: result.error };
  refresh();
  return { ok: true };
}

const DisputeUpdate = z.object({
  id: z.string().max(80),
  status: z.enum(["reviewing", "resolved"]),
  note: Note.optional(),
});

export async function updateDisputeAction(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const session = await requireRole("admin");
  const parsed = DisputeUpdate.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const result = await updateDispute(getRepos(), { ...parsed.data, orgId: session.orgId, now: new Date() });
  if (!result.ok) return { ok: false, error: result.error };
  refresh();
  return { ok: true };
}
