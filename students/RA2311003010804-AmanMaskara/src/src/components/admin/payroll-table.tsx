import { useTranslations } from "next-intl";
import { CircleCheck, FileClock, Scale } from "lucide-react";
import type { PayrollRow } from "@/server/services/payroll";
import { formatDuration, formatINR, formatRupees } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PayGapButton } from "@/components/admin/paid-records";

/** Sentinel status for one row: nothing recorded yet, matches, gap paid, or a possible shortfall (with "Pay the gap"). */
function CheckBadge({ row, month }: { row: PayrollRow; month: string }) {
  const t = useTranslations("admin.payrollPage.check");
  if (row.check.status === "no_record") {
    return (
      <Badge>
        <FileClock aria-hidden="true" className="size-4" />
        {t("noRecord")}
      </Badge>
    );
  }
  if (row.outstanding === 0) {
    return (
      <Badge tone="success">
        <CircleCheck aria-hidden="true" className="size-4" />
        {row.arrearsPaid > 0 ? t("gapPaid", { amount: formatRupees(row.arrearsPaid) }) : t("matches")}
      </Badge>
    );
  }
  const amount = formatRupees(row.outstanding);
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Badge tone="danger">
        <Scale aria-hidden="true" className="size-4" />
        {t("shortfall", { amount })}
      </Badge>
      <PayGapButton workerId={row.workerId} month={month} amount={amount} />
    </span>
  );
}

/** The month's payroll with each worker's sentinel check: cards on phones, a table with totals on laptops. */
export function PayrollTable({ rows, month }: { rows: PayrollRow[]; month: string }) {
  const t = useTranslations("admin.payrollPage");
  const totals = rows.reduce(
    (acc, r) => ({ gross: acc.gross + r.gross, net: acc.net + r.net, ot: acc.ot + r.overtimeMinutes }),
    { gross: 0, net: 0, ot: 0 },
  );
  const overtime = (r: PayrollRow) => (r.overtimeMinutes ? formatDuration(r.overtimeMinutes) : "—");
  const paid = (r: PayrollRow) => (r.paid ? formatINR(r.paid.netPaid) : "—");
  const headings = [
    { label: t("worker") },
    { label: t("days") },
    { label: t("regular") },
    { label: t("overtime") },
    { label: t("gross"), end: true },
    { label: t("pf"), end: true },
    { label: t("net"), end: true },
    { label: t("paid"), end: true },
    { label: t("checkColumn") },
  ];

  return (
    <>
      {/* Phones: a card per worker with net pay prominent, then the totals. */}
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((r) => (
          <li key={r.workerId}>
            <Card className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold">{r.name}</p>
                  <p className="text-sm text-ink-2">
                    #{r.code} · {t(`basis.${r.basis}`)}
                  </p>
                </div>
                <p className="figure text-right text-lg font-semibold">
                  {formatINR(r.net)}
                  <span className="eyebrow block">{t("net")}</span>
                </p>
              </div>
              <dl className="grid grid-cols-3 gap-2 border-t border-line pt-2 text-sm">
                <div>
                  <dt className="eyebrow">{t("days")}</dt>
                  <dd className="figure">{r.daysWorked}</dd>
                </div>
                <div>
                  <dt className="eyebrow">{t("overtime")}</dt>
                  <dd className="figure">{overtime(r)}</dd>
                </div>
                <div>
                  <dt className="eyebrow">{t("paid")}</dt>
                  <dd className="figure">{paid(r)}</dd>
                </div>
              </dl>
              <CheckBadge row={r} month={month} />
            </Card>
          </li>
        ))}
        <li>
          <Card className="flex items-center justify-between bg-primary-soft p-4">
            <span className="font-bold">{t("total")}</span>
            <span className="figure text-lg font-semibold">{formatINR(totals.net)}</span>
          </Card>
        </li>
      </ul>

      <Card className="hidden overflow-x-auto p-0 md:block" tabIndex={0} role="region" aria-label={t("title")}>
        <table className="w-full min-w-[900px] text-left">
          <caption className="sr-only">{t("title")}</caption>
          <thead className="border-b border-line text-xs tracking-wide text-ink-2 uppercase">
            <tr>
              {headings.map(({ label, end }) => (
                <th key={label} scope="col" className={end ? "px-4 py-3 text-right font-bold" : "px-4 py-3 font-bold"}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.workerId} className="border-t border-line transition-colors hover:bg-surface-2/50">
                <th scope="row" className="px-4 py-3 font-semibold">
                  {r.name}
                  <span className="block text-sm font-normal text-ink-2">
                    #{r.code} · {t(`basis.${r.basis}`)}
                  </span>
                </th>
                <td className="figure px-4 py-3">{r.daysWorked}</td>
                <td className="figure px-4 py-3 whitespace-nowrap">{formatDuration(r.regularMinutes)}</td>
                <td className="figure px-4 py-3 whitespace-nowrap">{overtime(r)}</td>
                <td className="figure px-4 py-3 text-right whitespace-nowrap">{formatINR(r.gross)}</td>
                <td className="figure px-4 py-3 text-right whitespace-nowrap">{formatINR(r.deductions)}</td>
                <td className="figure px-4 py-3 text-right font-bold whitespace-nowrap">{formatINR(r.net)}</td>
                <td className="figure px-4 py-3 text-right whitespace-nowrap">{paid(r)}</td>
                <td className="px-4 py-3">
                  <CheckBadge row={r} month={month} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="figure border-t-2 border-ink/60 bg-surface-2/50 font-bold">
            <tr>
              <th scope="row" className="px-4 py-3">
                {t("total")}
              </th>
              <td className="px-4 py-3" />
              <td className="px-4 py-3" />
              <td className="px-4 py-3 whitespace-nowrap">{formatDuration(totals.ot)}</td>
              <td className="px-4 py-3 text-right whitespace-nowrap">{formatINR(totals.gross)}</td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3 text-right whitespace-nowrap">{formatINR(totals.net)}</td>
              <td className="px-4 py-3" colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </Card>
    </>
  );
}
