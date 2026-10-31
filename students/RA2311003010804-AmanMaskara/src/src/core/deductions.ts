// ─── FairShift Statutory Deductions (demo) ──────────────────────────
// Provident Fund: employee share of 12% on regular (basic) earnings.
// Overtime is excluded from the PF base. Amounts in integer paise.

import type { Deduction } from "./pay";

export const PF_RATE = 0.12;

export function computeDeductions(regularPay: number): Deduction[] {
  if (regularPay <= 0) return [];
  return [{ label: "pf", amount: Math.round(regularPay * PF_RATE) }];
}
