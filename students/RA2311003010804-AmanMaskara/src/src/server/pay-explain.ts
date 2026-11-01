import "server-only";
import { getTranslations } from "next-intl/server";
import { formatDuration, formatINR, formatRupees } from "@/lib/format";
import type { PayFinding } from "@/core/pay-check";
import type { PayslipView } from "@/server/services/payslip";
import type { PayFacts } from "@/ai/explain-pay";

/** Deterministic, translated explanation of a payslip — always correct, used as the primary text. */
export async function payTemplate(view: PayslipView): Promise<{ sentences: string[]; facts: PayFacts }> {
  const t = await getTranslations("pay.explain");
  const { payslip, daysWorked, totalMinutes } = view;
  const ot = payslip.lines.find((l) => l.kind === "overtime");
  const pf = payslip.deductions.reduce((sum, d) => sum + d.amount, 0);

  const values: Record<string, string> = {
    days: String(daysWorked),
    hours: formatDuration(totalMinutes),
    net: formatINR(payslip.net),
  };
  const sentences = [t("worked", { days: values.days, hours: values.hours })];
  if (ot) {
    values.otHours = formatDuration(ot.minutes ?? 0);
    values.otPay = formatINR(ot.amount);
    sentences.push(t("overtime", { otHours: values.otHours, otPay: values.otPay }));
  }
  if (pf > 0) {
    values.pf = formatINR(pf);
    sentences.push(t("pf", { pf: values.pf }));
  }
  sentences.push(t("net", { net: values.net }));
  return { sentences, facts: { values } };
}

/**
 * One plain-words sentence per possible shortfall, with the arithmetic, e.g.
 * "13h 32m overtime recorded, 9h paid → 4h 32m × ₹200/h = ₹907".
 */
export async function findingSentences(findings: PayFinding[]): Promise<string[]> {
  const t = await getTranslations("pay.sentinel.finding");
  return findings.map(({ code, expected, paid, difference, explanation: e }) => {
    switch (code) {
      case "OVERTIME_UNDERPAID":
      case "REGULAR_UNDERPAID":
        return t(code === "OVERTIME_UNDERPAID" ? "overtime" : "regular", {
          recorded: formatDuration(e.recordedMinutes),
          paid: formatDuration(e.paidMinutes),
          missing: formatDuration(e.missingMinutes),
          rate: formatRupees(e.rate),
          amount: formatRupees(difference),
        });
      case "BELOW_MINIMUM_WAGE":
        return t("minimum", {
          hours: formatDuration(e.workedMinutes),
          minimum: formatRupees(expected),
          paid: formatRupees(paid),
        });
      case "DEDUCTION_MISMATCH":
        return t("deduction", {
          withheld: formatRupees(e.withheld),
          expected: formatRupees(e.expectedDeductions),
          amount: formatRupees(difference),
        });
    }
  });
}
