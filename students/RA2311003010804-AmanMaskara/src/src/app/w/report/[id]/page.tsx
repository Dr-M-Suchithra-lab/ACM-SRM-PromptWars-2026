import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { KeyRound, Lock, Users } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { trackedReports } from "@/server/hazard-tracking";
import { isReporter, sweepHazards } from "@/server/services/hazards";
import { SpeakButton } from "@/components/speak-button";
import { SuccessCheck } from "@/components/success-check";
import { HazardIcon } from "@/components/hazard-icon";
import { HazardAge, HazardStatusBadge, HazardTimeline } from "@/components/hazard-status";
import { Badge } from "@/components/ui/badge";
import { ConfirmFix } from "@/components/worker/confirm-fix";

export default async function ReportDetail({ params, searchParams }: PageProps<"/w/report/[id]">) {
  const session = await requireRole("worker");
  const [{ id }, query, locale] = await Promise.all([params, searchParams, getLocale()]);
  const repos = getRepos();
  const now = new Date();
  const [hazards, tracked, org] = await Promise.all([
    sweepHazards(repos, session.orgId, now),
    trackedReports(),
    repos.orgs.getById(session.orgId),
  ]);
  const hazard = hazards.find((h) => h.id === id);
  // A private reference also follows a report that a manager merged into this one.
  const trackedRef = tracked.find(
    (r) => r.hazardId === id || hazards.find((h) => h.id === r.hazardId)?.mergedInto === id,
  )?.ref;
  // Only the reporter (or the phone holding the private reference) may follow a report.
  if (!hazard || !org || (!isReporter(hazard, session.uid) && !trackedRef)) notFound();
  if (hazard.mergedInto) redirect(`/w/report/${hazard.mergedInto}`);

  const t = await getTranslations("report");
  const label = t(`categories.${hazard.category}`);
  const statusText = t(`status.${hazard.status}`);
  const anonymous = !isReporter(hazard, session.uid);
  const transcript =
    hazard.reports.find((r) => r.reporterId === session.uid)?.transcript ?? hazard.reports[0]?.transcript;
  const canConfirm = hazard.status === "fixed" && hazard.confirmation === "pending";
  const isNew = query.new === "1" || query.new === "merged";

  return (
    <div className="flex flex-col gap-4 md:mx-auto md:w-full md:max-w-3xl">
      {isNew && (
        <div
          role="status"
          aria-live="polite"
          className="card rise-in flex flex-col items-center gap-2 px-5 py-8 text-center"
        >
          <SuccessCheck className="size-20" />
          <p className="font-display text-3xl font-extrabold">{t("sent")}</p>
          <p>{query.new === "merged" ? t("sentMerged") : t("sentHint")}</p>
        </div>
      )}

      {trackedRef && (
        <p className="card flex items-start gap-3 p-4">
          <KeyRound aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
          <span>
            {t("track.yourRef")} <strong className="figure tracking-widest">{trackedRef}</strong>
            <span className="block text-sm text-ink-2">{t("track.keepIt")}</span>
          </span>
        </p>
      )}

      {canConfirm && <ConfirmFix hazardId={hazard.id} />}

      <section className="hero-card flex flex-col gap-4 p-5 md:p-7">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display flex items-center gap-3 text-3xl font-extrabold">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-danger-soft text-danger">
              <HazardIcon category={hazard.category} className="size-8" />
            </span>
            {label}
          </h1>
          <SpeakButton text={`${label}. ${statusText}.`} className="bg-white/70" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HazardStatusBadge status={hazard.status} />
          <HazardAge hazard={hazard} now={now} />
          {hazard.reports.length > 1 && (
            <Badge tone="info">
              <Users aria-hidden="true" className="size-4" />
              {t("reportCount", { count: hazard.reports.length })}
            </Badge>
          )}
        </div>
        {transcript && <p className="rounded-2xl bg-white/80 px-4 py-3 italic">“{transcript}”</p>}
        {hazard.location && <p className="text-ink-2">{hazard.location}</p>}
        {anonymous && (
          <p className="flex items-center gap-2 text-sm text-ink-2">
            <Lock aria-hidden="true" className="size-4" />
            {t("anonymousNote")}
          </p>
        )}
      </section>

      {hazard.status === "dismissed" && hazard.dismissReason && (
        <section className="card p-5">
          <h2 className="font-bold">{t("dismissedBecause")}</h2>
          <p>{t(`dismissReasons.${hazard.dismissReason}`)}</p>
          {hazard.dismissNote && <p className="text-ink-2">{hazard.dismissNote}</p>}
        </section>
      )}

      {hazard.status === "fixed" && hazard.fixNote && (
        <section className="card flex flex-col gap-3 p-5">
          <h2 className="font-bold">{t("whatWasDone")}</h2>
          <p>{hazard.fixNote}</p>
          {hazard.fixPhotoDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- data URL from the manager's phone
            <img src={hazard.fixPhotoDataUrl} alt={t("afterPhotoAlt")} className="max-h-64 rounded-2xl object-cover" />
          )}
        </section>
      )}

      <section aria-labelledby="timeline" className="card p-5">
        <h2 id="timeline" className="font-display mb-4 text-2xl font-extrabold">
          {t("timeline")}
        </h2>
        <HazardTimeline timeline={hazard.timeline} sector={org.sector} locale={locale} />
      </section>
    </div>
  );
}
