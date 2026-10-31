import { useLocale, useTranslations } from "next-intl";
import { FileText } from "lucide-react";
import type { EligibilityRow } from "@/server/services/benefits";
import { certificateToken } from "@/server/passport";
import { getScheme } from "@/config/schemes";
import type { Locale } from "@/i18n/locales";
import { Badge } from "@/components/ui/badge";
import { CertificateDecision } from "@/components/admin/decision-buttons";

function ProgressBadge({ progress }: { progress: EligibilityRow["progress"] }) {
  const t = useTranslations("admin.peoplePage.certificates");
  return (
    <Badge tone={progress.done >= progress.needed ? "success" : "warning"} className="figure">
      {t("progress", { done: progress.done, needed: progress.needed })}
    </Badge>
  );
}

/** Welfare-certificate requests waiting for the manager: only these need a decision up top. */
export function CertificateApprovals({ approvals }: { approvals: EligibilityRow[] }) {
  const t = useTranslations("admin.peoplePage.certificates");
  const locale = useLocale() as Locale;
  return (
    <section id="certificates" aria-labelledby="cert-title" className="flex scroll-mt-24 flex-col gap-3">
      <h2 id="cert-title" className="font-display text-xl font-extrabold">
        {t("title")}
      </h2>
      <p className="text-sm text-ink-2">{t("hint")}</p>
      {approvals.length === 0 ? (
        <p className="text-ink-2">{t("none")}</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {approvals.map(({ worker, schemeId, progress, request }) => (
            <li key={`${worker.id}-${schemeId}`} className="card flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{worker.name}</p>
                  <p className="text-sm text-ink-2">{getScheme(schemeId)?.name[locale]}</p>
                </div>
                <ProgressBadge progress={progress} />
              </div>
              <p className="text-sm font-semibold">{t("requested", { days: request!.daysWorked })}</p>
              <CertificateDecision id={request!.id} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** One worker's welfare-certificate progress, compact enough for a table cell. */
export function CertificateProgress({ rows }: { rows: EligibilityRow[] }) {
  const t = useTranslations("admin.peoplePage.certificates");
  const locale = useLocale() as Locale;
  if (rows.length === 0) return <p className="text-sm text-ink-2">{t("notYet")}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {rows.map(({ schemeId, progress, request }) => (
        <li key={schemeId} className="flex flex-col items-start gap-1 text-sm">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold">{getScheme(schemeId)?.name[locale]}</span>
            <ProgressBadge progress={progress} />
          </span>
          {request?.status === "requested" && (
            <a href="#certificates" className="font-bold text-primary underline underline-offset-4">
              {t("waiting")}
            </a>
          )}
          {request?.status === "approved" && (
            <a
              href={`/certificate/${certificateToken(request.id, request.decidedAt ?? request.requestedAt)}`}
              className="flex items-center gap-1.5 font-bold text-primary underline underline-offset-4"
            >
              <FileText aria-hidden="true" className="size-4" />
              {t("view")}
            </a>
          )}
          {request?.status === "rejected" && <span className="text-ink-2">{t("rejected")}</span>}
          {!request && (
            <span className="text-ink-2">{progress.done >= progress.needed ? t("eligibleNoRequest") : t("close")}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
