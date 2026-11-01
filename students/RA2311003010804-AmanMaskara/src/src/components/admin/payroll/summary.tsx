import { useTranslations } from "next-intl";
import { CircleAlert, CircleCheck, FileClock, Wallet } from "lucide-react";
import type { LedgerSummary } from "@/server/services/payroll-ledger";
import { formatINR, formatRupees } from "@/lib/format";
import { cn } from "@/lib/utils";

/** The month in four numbers, with what FairPay Sentinel does in one line underneath. */
export function PayrollSummary({ summary }: { summary: LedgerSummary }) {
  const t = useTranslations("admin.payrollPage");
  const stats = [
    {
      icon: Wallet,
      label: t("summary.due"),
      value: formatINR(summary.due),
      hint: t("summary.dueHint", { count: summary.workers }),
    },
    {
      icon: CircleCheck,
      label: t("summary.paid"),
      value: formatINR(summary.paid),
      hint: t("summary.paidHint", { recorded: summary.recorded, total: summary.workers }),
    },
    {
      icon: CircleAlert,
      label: t("summary.shortfalls"),
      value: String(summary.shortfalls.count),
      hint: summary.shortfalls.count
        ? t("summary.shortfallsHint", { amount: formatRupees(summary.shortfalls.amount) })
        : t("summary.noShortfalls"),
      alert: summary.shortfalls.count > 0,
    },
    {
      icon: FileClock,
      label: t("summary.notEntered"),
      value: String(summary.notEntered),
      hint: t("summary.notEnteredHint"),
    },
  ];

  return (
    <section aria-labelledby="payroll-summary" className="hero-card flex flex-col gap-4 p-5">
      <h2 id="payroll-summary" className="sr-only">
        {t("sentinel.title")}
      </h2>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ icon: Icon, label, value, hint, alert }) => (
          <div key={label} className="flex flex-col gap-1 rounded-2xl bg-surface/70 p-3">
            <dt className="flex items-center gap-1.5 text-sm font-bold text-ink-2">
              <Icon aria-hidden="true" className={cn("size-4", alert ? "text-danger" : "text-primary")} />
              {label}
            </dt>
            <dd className={cn("figure text-2xl font-extrabold", alert && "text-danger")}>{value}</dd>
            <dd className="text-xs text-ink-2">{hint}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-ink-2">
        <span className="font-bold text-ink">{t("sentinel.title")}:</span> {t("sentinel.hint")}{" "}
        {t("sentinel.minimumWageNote")}
      </p>
    </section>
  );
}
