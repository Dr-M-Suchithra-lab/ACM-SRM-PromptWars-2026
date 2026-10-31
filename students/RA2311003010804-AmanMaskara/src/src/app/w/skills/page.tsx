import { getLocale, getTranslations } from "next-intl/server";
import { BadgeCheck, Clock, XCircle } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { benefitsFor } from "@/server/services/benefits";
import { passportData } from "@/server/services/passport";
import { certificateToken } from "@/server/passport";
import { verifiedTotals } from "@/core/work-history";
import { getScheme } from "@/config/schemes";
import type { Locale } from "@/i18n/locales";
import { formatDuration } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { SpeakButton } from "@/components/speak-button";
import { PageHeader } from "@/components/page-header";
import { LogoutButton } from "@/components/logout-button";
import { WorkHistoryList } from "@/components/work-history";
import { Benefits, type BenefitCard } from "@/components/worker/benefits";
import { PassportShare } from "@/components/worker/passport-share";
import { AddSkill } from "@/components/skill-form";

function formatYear(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(date);
}

export default async function MePage() {
  const session = await requireRole("worker");
  const [t, tb, locale] = await Promise.all([
    getTranslations("skills"),
    getTranslations("benefits"),
    getLocale() as Promise<Locale>,
  ]);
  const repos = getRepos();
  const now = new Date();
  const [data, benefits] = await Promise.all([passportData(repos, session.uid), benefitsFor(repos, session.uid, now)]);
  if (!data || !benefits) return null;
  const { worker, org, skills, history } = data;
  const verified = skills.filter((s) => s.verifiedBy).length;
  const totals = verifiedTotals(history);

  // Only this worker's scheme texts in their language travel to the browser.
  const cards: BenefitCard[] = benefits.results.flatMap((result) => {
    const scheme = getScheme(result.schemeId);
    if (!scheme) return [];
    const certificate = benefits.certificates.find((c) => c.schemeId === scheme.id && c.status !== "rejected");
    return [
      {
        schemeId: scheme.id,
        name: scheme.name[locale],
        summary: scheme.summary[locale],
        benefits: scheme.benefits.map((b) => b[locale]),
        documents: scheme.documentsNeeded.map((d) => d[locale]),
        howToApply: scheme.howToApply[locale],
        officialLink: scheme.officialLink,
        source: scheme.source,
        needsWorkCertificate: scheme.needsWorkCertificate,
        conditions: [...scheme.conditions],
        done: result.progress.done,
        needed: result.progress.needed,
        daysRemaining: result.daysRemaining,
        wageTooHigh: result.failedConditions.includes("max_monthly_wage"),
        certificate: certificate && {
          status: certificate.status,
          url:
            certificate.status === "approved"
              ? `/certificate/${certificateToken(certificate.id, certificate.decidedAt ?? certificate.requestedAt)}`
              : undefined,
        },
      },
    ];
  });

  return (
    <div className="flex flex-col gap-6 md:mx-auto md:w-full md:max-w-3xl">
      <PageHeader
        title={worker.name}
        eyebrow={t("eyebrow")}
        action={
          <SpeakButton
            text={`${worker.name}. ${worker.jobTitle}, ${org.name}. ${t("summary", { count: skills.length, verified })}`}
          />
        }
      >
        {worker.jobTitle} · {org.name}
      </PageHeader>

      <section id="benefits" aria-labelledby="benefits-title" className="flex scroll-mt-24 flex-col gap-3">
        <div>
          <h2 id="benefits-title" className="font-display text-2xl font-extrabold">
            {tb("title")}
          </h2>
          <p className="text-ink-2">{tb("intro")}</p>
        </div>
        <Benefits cards={cards} />
      </section>

      <section aria-labelledby="history-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="history-title" className="font-display text-2xl font-extrabold">
            {t("historyTitle")}
          </h2>
          <span className="figure text-sm font-semibold text-ink-2">
            {t("historyTotals", { days: totals.days, hours: formatDuration(totals.minutes) })}
          </span>
        </div>
        <WorkHistoryList entries={history} showHours locale={locale} />
      </section>

      <section aria-labelledby="skills-title" className="flex flex-col gap-3">
        <h2 id="skills-title" className="font-display text-2xl font-extrabold">
          {t("title")}
        </h2>
        <p className="text-ink-2">{t("summary", { count: skills.length, verified })}</p>
        <AddSkill />
        <ul className="stagger flex flex-col gap-2.5">
          {[...skills]
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .map((skill) => (
              <li key={skill.id} className="card flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-strong"
                  >
                    <BadgeCheck className="size-6" />
                  </span>
                  <div>
                    <p className="font-bold">{skill.title}</p>
                    <p className="text-sm text-ink-2">
                      {skill.issuer} · {formatYear(skill.date)}
                    </p>
                  </div>
                </div>
                {skill.verifiedBy ? (
                  <Badge tone="success">
                    <BadgeCheck aria-hidden="true" className="size-4" />
                    {t("verified")}
                  </Badge>
                ) : skill.rejected ? (
                  <Badge>
                    <XCircle aria-hidden="true" className="size-4" />
                    {t("rejected")}
                  </Badge>
                ) : (
                  <Badge tone="warning">
                    <Clock aria-hidden="true" className="size-4" />
                    {t("pending")}
                  </Badge>
                )}
              </li>
            ))}
        </ul>
      </section>

      <PassportShare />

      <LogoutButton className="w-full" />
    </div>
  );
}
