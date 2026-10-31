import { computePayslip } from "@/core/pay";
import { computeDeductions } from "@/core/deductions";
import { monthRange } from "@/core/period";
import { minutesByDay } from "@/core/overtime";
import type { ClosedShift, Payslip, Shift } from "@/core/types";
import type { Org, Repos, Worker } from "@/server/repos/types";

export interface PayslipView {
  worker: Worker;
  org: Org;
  payslip: Payslip;
  daysWorked: number;
  totalMinutes: number;
}

/** Payslip for one worker and one IST month. Regular pay first (PF base), then deductions applied. */
export async function buildPayslip(repos: Repos, workerId: string, month: string): Promise<PayslipView | null> {
  const worker = await repos.workers.getById(workerId);
  const org = worker ? await repos.orgs.getById(worker.orgId) : undefined;
  if (!worker || !org) return null;

  const { start, end } = monthRange(month);
  return payslipFrom(
    worker,
    org,
    month,
    await repos.shifts.getByWorkerInRange(workerId, start, new Date(end.getTime() - 1)),
  );
}

/** The same payslip from already-loaded data, so payroll can build every row from one batch of queries. */
export function payslipFrom(worker: Worker, org: Org, month: string, monthShifts: Shift[]): PayslipView {
  const shifts = monthShifts.filter((s): s is ClosedShift => Boolean(s.outAt));
  const base = computePayslip(worker.id, month, shifts, worker.pay, org.labourRules);
  const regularPay = base.lines.find((l) => l.kind === "regular")?.amount ?? 0;
  const payslip = computePayslip(worker.id, month, shifts, worker.pay, org.labourRules, computeDeductions(regularPay));
  const byDay = minutesByDay(shifts);

  return {
    worker,
    org,
    payslip,
    daysWorked: byDay.size,
    totalMinutes: [...byDay.values()].reduce((a, b) => a + b, 0),
  };
}
