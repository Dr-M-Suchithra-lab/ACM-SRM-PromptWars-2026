import { useLocale, useTranslations } from "next-intl";
import type { PayDispute } from "@/server/repos/types";
import { formatMonth, formatRupees } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { DisputeControls } from "@/components/admin/dispute-controls";

const STATUS_TONE = { open: "warning", reviewing: "info", resolved: "success" } as const;

/** Workers' pay-review requests, unresolved first then newest, each with the controls to move it along. */
export function DisputeList({ disputes, nameOf }: { disputes: PayDispute[]; nameOf: Map<string, string> }) {
  const t = useTranslations("admin.payrollPage.disputes");
  const locale = useLocale();
  const sorted = [...disputes].sort(
    (a, b) =>
      Number(a.status === "resolved") - Number(b.status === "resolved") ||
      b.createdAt.getTime() - a.createdAt.getTime(),
  );

  return (
    <section id="disputes" aria-labelledby="disputes-title" className="flex scroll-mt-24 flex-col gap-3">
      <h2 id="disputes-title" className="font-display text-xl font-extrabold">
        {t("title")}
      </h2>
      {sorted.length === 0 ? (
        <p className="text-ink-2">{t("none")}</p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {sorted.map((d) => (
            <li key={d.id} className="card flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{nameOf.get(d.workerId) ?? d.workerId}</p>
                  <p className="text-sm text-ink-2">
                    {formatMonth(d.month, locale)} · {t("shortfall", { amount: formatRupees(d.shortfall) })}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[d.status]}>{t(`status.${d.status}`)}</Badge>
              </div>
              <ul className="flex flex-wrap gap-1">
                {d.findings.map((code) => (
                  <li key={code}>
                    <Badge>{t(`codes.${code}`)}</Badge>
                  </li>
                ))}
              </ul>
              {d.settledAmount !== undefined && (
                <p className="rounded-xl bg-success-soft px-3 py-2 text-sm font-semibold text-success">
                  {t("settled", { amount: formatRupees(d.settledAmount) })}
                </p>
              )}
              {d.resolutionNote && <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm">{d.resolutionNote}</p>}
              <DisputeControls id={d.id} status={d.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
