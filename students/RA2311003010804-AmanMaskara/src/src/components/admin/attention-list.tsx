import Link from "next/link";
import { useTranslations } from "next-intl";
import { BatteryLow, CheckCircle2, FileText, Megaphone, Scale, Siren } from "lucide-react";
import type { Hazard } from "@/core/types";
import type { EscalationRole } from "@/config/hazard-sla";
import type { CertificateRequest, PayDispute, SiteIssue } from "@/server/repos/types";
import type { WorkerHealth } from "@/server/services/workforce";
import { formatRupees } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { HazardIcon } from "@/components/hazard-icon";
import { HazardAge } from "@/components/hazard-status";
import { FatigueReasons, RiskReasons, riskTone } from "@/components/admin/reason-chips";

/** Everything on the overview that needs a decision, already filtered and in priority order. */
export interface AttentionItems {
  /** Escalated hazards first, then other urgent ones. */
  hazards: Hazard[];
  disputes: PayDispute[];
  issues: SiteIssue[];
  certificates: CertificateRequest[];
  tired: WorkerHealth[];
  atRisk: WorkerHealth[];
}

const ROW = "flex flex-wrap items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-surface-2";

/** "Needs attention": one row per item, each linking to the page where it is handled. */
export function AttentionList({
  items,
  count,
  nameOf,
  chain,
  now,
}: {
  items: AttentionItems;
  count: number;
  nameOf: Map<string, string>;
  chain: readonly EscalationRole[];
  now: Date;
}) {
  const t = useTranslations("admin");
  const tr = useTranslations("report");

  return (
    <section aria-labelledby="attention" className="card flex flex-col gap-2 p-4 md:p-5">
      <h2 id="attention" className="font-display flex items-center justify-between gap-2 px-1 text-xl font-extrabold">
        {t("needsAttention")}
        <Badge tone={count ? "danger" : "success"}>{count}</Badge>
      </h2>
      {count === 0 ? (
        <p className="flex items-center gap-2 px-1 text-ink-2">
          <CheckCircle2 aria-hidden="true" className="size-5 text-success" />
          {t("allClear")}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {items.hazards.map((h) => (
            <li key={h.id}>
              <Link href={`/a/hazards#${h.id}`} className={ROW}>
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl",
                    h.escalationLevel ? "bg-danger text-white" : "bg-danger-soft text-danger",
                  )}
                >
                  <HazardIcon category={h.category} className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{tr(`categories.${h.category}`)}</span>
                  <span className="block truncate text-sm text-ink-2">
                    {h.reports[0]?.transcriptEn || h.reports[0]?.transcript}
                  </span>
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    {h.escalationLevel > 0 && (
                      <Badge tone="solidDanger">
                        <Siren aria-hidden="true" className="size-4" />
                        {t("escalatedTo", {
                          role: tr(`roles.${chain[Math.min(h.escalationLevel, chain.length) - 1]}`),
                        })}
                      </Badge>
                    )}
                    <HazardAge hazard={h} now={now} />
                    <Badge tone="danger">{tr(`severity.${h.severity}`)}</Badge>
                  </span>
                </span>
              </Link>
            </li>
          ))}
          {items.disputes.map((d) => (
            <li key={d.id}>
              <Link href="/a/payroll#disputes" className={ROW}>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-warning-ink">
                  <Scale aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0 flex-1 font-bold">
                  {t("attention.dispute", {
                    name: nameOf.get(d.workerId) ?? "",
                    amount: formatRupees(d.shortfall),
                  })}
                </span>
                <Badge tone="warning">{t(`disputeStatus.${d.status}`)}</Badge>
              </Link>
            </li>
          ))}
          {items.issues.map((issue) => (
            <li key={issue.id}>
              <Link href="/a/feedback#issues" className={ROW}>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-info-soft text-[#2558b5]">
                  <Megaphone aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{issue.text}</span>
                  <span className="block text-sm text-ink-2">{t("attention.issue", { count: issue.signerCount })}</span>
                </span>
              </Link>
            </li>
          ))}
          {items.certificates.map((c) => (
            <li key={c.id}>
              <Link href="/a/people#certificates" className={ROW}>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success">
                  <FileText aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0 flex-1 font-bold">
                  {t("attention.certificate", { name: nameOf.get(c.workerId) ?? "", days: c.daysWorked })}
                </span>
              </Link>
            </li>
          ))}
          {items.tired.map((w) => (
            <li key={`f-${w.worker.id}`}>
              <Link href="/a/people" className={ROW}>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning-soft text-warning-ink">
                  <BatteryLow aria-hidden="true" className="size-5" />
                </span>
                <span className="font-bold">{w.worker.name}</span>
                <FatigueReasons alerts={w.fatigue} />
              </Link>
            </li>
          ))}
          {items.atRisk.map((w) => (
            <li key={`r-${w.worker.id}`}>
              <Link href="/a/people" className={ROW}>
                <Badge tone={riskTone(w.risk.score)}>{t("riskScore", { score: w.risk.score })}</Badge>
                <span className="font-bold">{w.worker.name}</span>
                <RiskReasons risk={w.risk} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
