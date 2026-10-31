import type { PayCheckResult } from "@/core/pay-check";
import type { PaidRecordEntry, Repos } from "@/server/repos/types";
import { monthRange } from "@/core/period";
import { payCheckFrom } from "./pay-check";
import { payslipFrom } from "./payslip";

export interface PayrollRow {
  workerId: string;
  name: string;
  code: string;
  basis: string;
  daysWorked: number;
  regularMinutes: number;
  overtimeMinutes: number;
  gross: number;
  deductions: number;
  net: number;
  /** What the employer recorded as paid, if anything yet */
  paid?: PaidRecordEntry;
  check: PayCheckResult;
  /** Arrears already paid for the month, and the gap still owed (paise) */
  arrearsPaid: number;
  outstanding: number;
  /** Paise per hour, for the manual entry form's calculations */
  rates: { regular: number; overtime: number };
}

export async function buildPayroll(repos: Repos, orgId: string, month: string): Promise<PayrollRow[]> {
  // Two round trips for the whole organisation, then every payslip and check is computed in memory.
  const [org, workers, sites, records] = await Promise.all([
    repos.orgs.getById(orgId),
    repos.workers.getByOrg(orgId),
    repos.sites.getByOrg(orgId),
    repos.paidRecords.getByOrgMonth(orgId, month),
  ]);
  if (!org) return [];
  const { start, end } = monthRange(month);
  const shifts = await repos.shifts.getByWorkersInRange(
    workers.map((w) => w.id),
    start,
    new Date(end.getTime() - 1),
  );
  const shiftsOf = Map.groupBy(shifts, (s) => s.workerId);
  const stateOf = new Map(sites.map((s) => [s.id, s.state]));
  const recordOf = new Map(records.map((r) => [r.workerId, r]));

  const rows: PayrollRow[] = [];
  for (const worker of workers) {
    const check = payCheckFrom(
      payslipFrom(worker, org, month, shiftsOf.get(worker.id) ?? []),
      recordOf.get(worker.id),
      stateOf.get(worker.siteId),
    );
    const { payslip, daysWorked } = check.view;
    rows.push({
      workerId: worker.id,
      name: worker.name,
      code: worker.code,
      basis: worker.pay.basis,
      daysWorked,
      regularMinutes: payslip.lines.find((l) => l.kind === "regular")?.minutes ?? 0,
      overtimeMinutes: payslip.lines.find((l) => l.kind === "overtime")?.minutes ?? 0,
      gross: payslip.gross,
      deductions: payslip.deductions.reduce((s, d) => s + d.amount, 0),
      net: payslip.net,
      paid: check.record,
      check: check.result,
      arrearsPaid: check.arrearsPaid,
      outstanding: check.outstanding,
      rates: check.rates,
    });
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}
