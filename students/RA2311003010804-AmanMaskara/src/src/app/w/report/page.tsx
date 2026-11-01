import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CircleHelp } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { trackedReports } from "@/server/hazard-tracking";
import { isReporter, sweepHazards } from "@/server/services/hazards";
import { getSectorProfile } from "@/core/sectors";
import type { Hazard } from "@/core/types";
import { SpeakButton } from "@/components/speak-button";
import { PageHeader } from "@/components/page-header";
import { HazardIcon } from "@/components/hazard-icon";
import { HazardAge, HazardStatusBadge } from "@/components/hazard-status";
import { Badge } from "@/components/ui/badge";
import { HazardReporter } from "@/components/worker/hazard-reporter";
import { TrackByRef } from "@/components/worker/track-by-ref";

export default async function ReportPage() {
  const session = await requireRole("worker");
  const t = await getTranslations("report");
  const repos = getRepos();
  const now = new Date();
  const [org, hazards, tracked] = await Promise.all([
    repos.orgs.getById(session.orgId),
    sweepHazards(repos, session.orgId, now),
    trackedReports(),
  ]);
  if (!org) return null;

  // My reports: named ones, plus anonymous ones this phone holds a private reference for.
  // A report merged into another one is followed through to where it now lives.
  const trackedIds = new Set(tracked.map((r) => r.hazardId));
  const byId = new Map(hazards.map((h) => [h.id, h]));
  const mine = new Map<string, Hazard>();
  for (const h of hazards) {
    if (!isReporter(h, session.uid) && !trackedIds.has(h.id)) continue;
    const shown = h.mergedInto ? byId.get(h.mergedInto) : h;
    if (shown) mine.set(shown.id, shown);
  }
  const reports = [...mine.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="flex flex-col gap-6 md:mx-auto md:w-full md:max-w-3xl">
      <PageHeader
        title={t("title")}
        action={<SpeakButton text={`${t("title")}. ${t("tapToSpeak")}. ${t("orTapIcon")}.`} />}
      />

      <HazardReporter categories={[...getSectorProfile(org.sector).hazardCategories]} />

      <section aria-labelledby="my-reports" className="flex flex-col gap-3">
        <h2 id="my-reports" className="font-display text-2xl font-extrabold">
          {t("myReports")}
        </h2>
        {reports.length === 0 ? (
          <p className="text-ink-2">{t("noReports")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {reports.map((h) => (
              <li key={h.id}>
                <Link href={`/w/report/${h.id}`} className="tile flex min-h-16 items-start gap-3 p-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger">
                    <HazardIcon category={h.category} className="size-6" />
                  </span>
                  {/* Title on its own line, badges underneath: they wrap instead of squeezing the words. */}
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="font-bold break-words">{t(`categories.${h.category}`)}</span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      {h.status === "fixed" && h.confirmation === "pending" && (
                        <Badge tone="info">
                          <CircleHelp aria-hidden="true" className="size-4" />
                          {t("confirm.badge")}
                        </Badge>
                      )}
                      <HazardAge hazard={h} now={now} />
                      <HazardStatusBadge status={h.status} />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <TrackByRef />
      </section>
    </div>
  );
}
