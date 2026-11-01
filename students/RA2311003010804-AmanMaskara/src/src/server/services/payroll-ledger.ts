import type { PayoutKind } from "@/core/payouts";
import type { PayrollRow } from "./payroll";
import type { MaskedAccount, PayoutOverview } from "./payouts";

/** Where each worker's month stands, in the order an employer acts on it. */
export type LedgerStatus = "waiting" | "shortfall" | "not_entered" | "gap_paid" | "matches";

/** One worker on the payroll page: what they earned, what was paid, the check, and how to pay them. */
export interface LedgerRow {
  workerId: string;
  name: string;
  code: string;
  basis: PayrollRow["basis"];
  daysWorked: number;
  regularMinutes: number;
  overtimeMinutes: number;
  /** Paise */
  gross: number;
  deductions: number;
  net: number;
  rates: PayrollRow["rates"];
  /** Net recorded as paid, plus any arrears; null while nothing is recorded */
  paid: number | null;
  outstanding: number;
  arrearsPaid: number;
  status: LedgerStatus;
  /** What a checkout would pay now (the month's pay or the open gap); null when nothing is owed */
  due: { kind: PayoutKind; amount: number } | null;
  account: MaskedAccount | null;
}

export interface LedgerSummary {
  workers: number;
  /** Paise: the month's net pay for everyone */
  due: number;
  /** Paise: everything recorded as paid, including arrears */
  paid: number;
  recorded: number;
  shortfalls: { count: number; amount: number };
  notEntered: number;
}

function statusOf(row: PayrollRow, waiting: boolean): LedgerStatus {
  if (waiting) return "waiting";
  if (!row.paid) return "not_entered";
  if (row.outstanding > 0) return "shortfall";
  return row.arrearsPaid > 0 ? "gap_paid" : "matches";
}

/** Payroll, bank details and checkouts for the month, as one row per worker plus the totals. */
export function buildLedger(
  rows: PayrollRow[],
  payouts: PayoutOverview,
): { rows: LedgerRow[]; summary: LedgerSummary } {
  const payableOf = new Map(payouts.payable.map((p) => [p.workerId, p]));
  const accountOf = new Map(payouts.accounts.map((a) => [a.workerId, a.account]));
  const ledger = rows.map((row): LedgerRow => {
    const payable = payableOf.get(row.workerId);
    return {
      workerId: row.workerId,
      name: row.name,
      code: row.code,
      basis: row.basis,
      daysWorked: row.daysWorked,
      regularMinutes: row.regularMinutes,
      overtimeMinutes: row.overtimeMinutes,
      gross: row.gross,
      deductions: row.deductions,
      net: row.net,
      rates: row.rates,
      paid: row.paid ? row.paid.netPaid + row.arrearsPaid : null,
      outstanding: row.outstanding,
      arrearsPaid: row.arrearsPaid,
      status: statusOf(row, payable?.busy ?? false),
      due: payable ? { kind: payable.kind, amount: payable.amount } : null,
      account: accountOf.get(row.workerId) ?? null,
    };
  });
  const shortfalls = ledger.filter((r) => r.status === "shortfall");
  return {
    rows: ledger,
    summary: {
      workers: ledger.length,
      due: ledger.reduce((sum, r) => sum + r.net, 0),
      paid: ledger.reduce((sum, r) => sum + (r.paid ?? 0), 0),
      recorded: ledger.filter((r) => r.paid !== null).length,
      shortfalls: { count: shortfalls.length, amount: shortfalls.reduce((sum, r) => sum + r.outstanding, 0) },
      notEntered: ledger.filter((r) => r.status === "not_entered").length,
    },
  };
}
