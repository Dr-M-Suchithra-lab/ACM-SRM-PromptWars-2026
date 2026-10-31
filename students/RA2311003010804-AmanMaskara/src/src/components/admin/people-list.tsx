import { useTranslations } from "next-intl";
import type { EligibilityRow } from "@/server/services/benefits";
import type { WorkerHealth } from "@/server/services/workforce";
import { formatDuration } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FatigueReasons, RiskReasons, riskTone } from "@/components/admin/reason-chips";
import { CertificateProgress } from "@/components/admin/certificates";

interface PeopleListProps {
  workers: WorkerHealth[];
  siteOf: Map<string, string>;
  certsOf: Map<string, EligibilityRow[]>;
}

/** Every worker's status, hours, fatigue, quit risk and certificates: cards on phones, a table on laptops. */
export function PeopleList({ workers, siteOf, certsOf }: PeopleListProps) {
  const t = useTranslations("admin.peoplePage");
  const onSiteBadge = (w: WorkerHealth) => (
    <Badge tone={w.onSite ? "success" : "neutral"}>{w.onSite ? t("onSite") : t("offSite")}</Badge>
  );
  const overtime = (w: WorkerHealth, className: string) =>
    w.overtimeThisWeek > 0 && (
      <span className={className}>{t("overtime", { hours: formatDuration(w.overtimeThisWeek) })}</span>
    );

  return (
    <section aria-labelledby="people-list" className="flex flex-col gap-3">
      <h2 id="people-list" className="font-display text-xl font-extrabold">
        {t("individualTitle")}
      </h2>
      {/* Phones: one card per worker, every column visible without sideways scrolling. */}
      <ul className="flex flex-col gap-3 md:hidden">
        {workers.map((w) => (
          <li key={w.worker.id}>
            <Card className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold">{w.worker.name}</p>
                  <p className="truncate text-sm text-ink-2">
                    {w.worker.jobTitle} · {siteOf.get(w.worker.siteId)}
                  </p>
                </div>
                <Badge tone={riskTone(w.risk.score)}>
                  {t("risk")} {w.risk.score}
                </Badge>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="eyebrow">{t("status")}</dt>
                  <dd>{onSiteBadge(w)}</dd>
                </div>
                <div>
                  <dt className="eyebrow">{t("thisWeek")}</dt>
                  <dd className="figure">
                    {formatDuration(w.weekMinutes)}
                    {overtime(w, "block text-ink-2")}
                  </dd>
                </div>
              </dl>
              <div className="flex flex-col gap-1">
                <p className="eyebrow">{t("fatigue")}</p>
                <FatigueReasons alerts={w.fatigue} />
              </div>
              <div className="flex flex-col gap-1">
                <p className="eyebrow">{t("risk")}</p>
                <RiskReasons risk={w.risk} />
              </div>
              <div className="flex flex-col gap-1">
                <p className="eyebrow">{t("certificates.column")}</p>
                <CertificateProgress rows={certsOf.get(w.worker.id) ?? []} />
              </div>
            </Card>
          </li>
        ))}
      </ul>

      {/* Laptops: the full comparison table. */}
      <Card className="hidden overflow-x-auto p-0 md:block" tabIndex={0} role="region" aria-label={t("title")}>
        <table className="w-full min-w-[920px] text-left">
          <caption className="sr-only">{t("title")}</caption>
          <thead className="border-b border-line text-xs tracking-wide text-ink-2 uppercase">
            <tr>
              {[t("worker"), t("status"), t("thisWeek"), t("fatigue"), t("risk"), t("certificates.column")].map(
                (heading) => (
                  <th key={heading} scope="col" className="px-4 py-3 font-bold">
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {workers.map((w) => (
              <tr key={w.worker.id} className="border-t border-line align-top transition-colors hover:bg-surface-2/50">
                <th scope="row" className="px-4 py-3 font-semibold">
                  {w.worker.name}
                  <span className="block text-sm font-normal text-ink-2">
                    {w.worker.jobTitle} · {siteOf.get(w.worker.siteId)}
                  </span>
                </th>
                <td className="px-4 py-3">{onSiteBadge(w)}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {formatDuration(w.weekMinutes)}
                  {overtime(w, "block text-sm text-ink-2")}
                </td>
                <td className="px-4 py-3">
                  <FatigueReasons alerts={w.fatigue} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <Badge tone={riskTone(w.risk.score)} className="w-fit">
                      {w.risk.score} / 100
                    </Badge>
                    <RiskReasons risk={w.risk} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <CertificateProgress rows={certsOf.get(w.worker.id) ?? []} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
