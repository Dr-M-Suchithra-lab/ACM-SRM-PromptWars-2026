import { getLocale, getTranslations } from "next-intl/server";
import { CircleHelp, Lock, MapPin, Siren, Users } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { sweepHazards } from "@/server/services/hazards";
import { ESCALATION_CHAINS } from "@/config/hazard-sla";
import { getHazardAge, isOpen } from "@/core/hazard-lifecycle";
import { canMerge } from "@/core/hazard-duplicates";
import type { Hazard, HazardSeverity, HazardStatus } from "@/core/types";
import { formatWhen } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { HazardIcon } from "@/components/hazard-icon";
import { HazardAge, HazardStatusBadge } from "@/components/hazard-status";
import { PageHeader } from "@/components/page-header";
import { HazardActions } from "@/components/admin/hazard-actions";

const COLUMNS: HazardStatus[] = ["received", "in_progress", "fixed", "dismissed"];
const SEVERITY_RANK: Record<HazardSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const SEVERITY_TONE = { critical: "solidDanger", high: "danger", medium: "warning", low: "neutral" } as const;
const CONFIRMATION_TONE = { pending: "info", confirmed: "success", auto_closed: "neutral" } as const;

/** Escalated first, then most severe, then oldest. */
function byUrgency(now: Date) {
  return (a: Hazard, b: Hazard) =>
    b.escalationLevel - a.escalationLevel ||
    SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
    getHazardAge(b, now) - getHazardAge(a, now);
}

export default async function HazardsPage() {
  const session = await requireRole("admin");
  const [t, tr, locale] = await Promise.all([
    getTranslations("admin.hazardsPage"),
    getTranslations("report"),
    getLocale(),
  ]);
  const repos = getRepos();
  const now = new Date();
  const [hazards, workers, sites, org] = await Promise.all([
    sweepHazards(repos, session.orgId, now),
    repos.workers.getByOrg(session.orgId),
    repos.sites.getByOrg(session.orgId),
    repos.orgs.getById(session.orgId),
  ]);
  if (!org) return null;
  const nameOf = new Map(workers.map((w) => [w.id, w.name]));
  const siteOf = new Map(sites.map((s) => [s.id, s.name]));
  const chain = ESCALATION_CHAINS[org.sector];
  const label = (h: Hazard) =>
    [tr(`categories.${h.category}`), h.location, siteOf.get(h.siteId)].filter(Boolean).join(" · ");
  const visible = hazards.filter((h) => !h.mergedInto).sort(byUrgency(now));
  const openHazards = visible.filter(isOpen);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")}>{t("intro")}</PageHeader>
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        {COLUMNS.map((column) => {
          const items = visible.filter((h) => h.status === column);
          return (
            <section
              key={column}
              aria-labelledby={`col-${column}`}
              className="flex flex-col gap-3 rounded-card border border-line bg-surface-2/50 p-3"
            >
              <h2 id={`col-${column}`} className="flex items-center justify-between font-bold">
                <HazardStatusBadge status={column} />
                <span className="figure flex size-8 items-center justify-center rounded-full bg-surface text-sm">
                  {items.length}
                </span>
              </h2>
              {items.length === 0 && <p className="text-sm text-ink-2">{t("empty")}</p>}
              <ul className="flex flex-col gap-3">
                {items.map((h) => {
                  const mergedHere = hazards.filter((m) => m.mergedInto === h.id);
                  return (
                    <li key={h.id} id={h.id} className="scroll-mt-24">
                      <article className="card flex flex-col gap-2.5 p-4" data-testid="hazard-card">
                        <div className="flex items-center gap-2">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger">
                            <HazardIcon category={h.category} className="size-5" />
                          </span>
                          <h3 className="flex-1 font-bold">{tr(`categories.${h.category}`)}</h3>
                          <Badge tone={SEVERITY_TONE[h.severity]}>{tr(`severity.${h.severity}`)}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {h.escalationLevel > 0 && isOpen(h) && (
                            <Badge tone="solidDanger">
                              <Siren aria-hidden="true" className="size-4" />
                              {t("escalatedTo", {
                                role: tr(`roles.${chain[Math.min(h.escalationLevel, chain.length) - 1]}`),
                              })}
                            </Badge>
                          )}
                          <HazardAge hazard={h} now={now} />
                          {h.reports.length > 1 && (
                            <Badge tone="info">
                              <Users aria-hidden="true" className="size-4" />
                              {t("reportedBy", { count: h.reports.length })}
                            </Badge>
                          )}
                          {h.status === "fixed" && h.confirmation && (
                            <Badge tone={CONFIRMATION_TONE[h.confirmation]}>
                              <CircleHelp aria-hidden="true" className="size-4" />
                              {t(`confirmation.${h.confirmation}`)}
                            </Badge>
                          )}
                        </div>
                        <ul className="flex flex-col gap-1.5">
                          {h.reports.map((r, i) => (
                            <li key={i} className="flex flex-col gap-1.5 rounded-xl bg-surface-2 px-3 py-2 text-sm">
                              {(r.transcriptEn || r.transcript) && <p>“{r.transcriptEn || r.transcript}”</p>}
                              {r.photoDataUrl && (
                                // eslint-disable-next-line @next/next/no-img-element -- data URL from the worker's phone
                                <img
                                  src={r.photoDataUrl}
                                  alt={t("photoAlt")}
                                  className="max-h-40 rounded-lg object-cover"
                                />
                              )}
                              <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink-2">
                                {r.reporterId ? (
                                  nameOf.get(r.reporterId)
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <Lock aria-hidden="true" className="size-3" />
                                    {t("anonymous")}
                                  </span>
                                )}
                                <span className="figure">{formatWhen(r.at, locale)}</span>
                              </p>
                            </li>
                          ))}
                        </ul>
                        <p className="flex items-center gap-1 text-xs text-ink-2">
                          <MapPin aria-hidden="true" className="size-3" />
                          {[siteOf.get(h.siteId), h.location].filter(Boolean).join(" · ")}
                        </p>
                        {h.status === "dismissed" && h.dismissReason && (
                          <p className="text-sm">
                            <span className="font-bold">{t("dismissedBecause")}</span>{" "}
                            {tr(`dismissReasons.${h.dismissReason}`)}
                            {h.dismissNote && ` — ${h.dismissNote}`}
                          </p>
                        )}
                        {h.status === "fixed" && h.fixNote && (
                          <p className="text-sm">
                            <span className="font-bold">{t("whatWasDone")}</span> {h.fixNote}
                          </p>
                        )}
                        <HazardActions
                          hazardId={h.id}
                          status={h.status}
                          mergeTargets={openHazards
                            .filter((o) => canMerge(h, o))
                            .map((o) => ({ id: o.id, label: label(o) }))}
                          merged={mergedHere.map((m) => ({ id: m.id, label: label(m) }))}
                        />
                      </article>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
