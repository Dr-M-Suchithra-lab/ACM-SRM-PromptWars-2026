import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MapPin, QrCode, Users } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { getSectorProfile } from "@/core/sectors";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

export default async function SitesPage() {
  const session = await requireRole("admin");
  const [t, ta, tr] = await Promise.all([
    getTranslations("admin.sitesPage"),
    getTranslations("admin"),
    getTranslations("report"),
  ]);
  const repos = getRepos();
  const [sites, workers] = await Promise.all([
    repos.sites.getByOrg(session.orgId),
    repos.workers.getByOrg(session.orgId),
  ]);

  const cards = await Promise.all(
    sites.map(async (site) => {
      const shifts = await repos.shifts.getBySite(site.id);
      const onSite = new Set(shifts.filter((s) => !s.outAt).map((s) => s.workerId)).size;
      return { site, onSite, assigned: workers.filter((w) => w.siteId === site.id).length };
    }),
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} />
      <ul className="grid gap-4 lg:grid-cols-2">
        {cards.map(({ site, onSite, assigned }) => {
          const profile = getSectorProfile(site.sector);
          return (
            <li key={site.id}>
              <Card className="flex h-full flex-col gap-4 p-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display flex items-center gap-3 text-xl font-extrabold">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary-strong">
                      <MapPin aria-hidden="true" className="size-5" />
                    </span>
                    {site.name}
                  </h2>
                  <Badge tone="brand">{ta(`sector.${site.sector}`)}</Badge>
                </div>
                <p className="flex items-center gap-2">
                  <Users aria-hidden="true" className="size-4" />
                  {t("people", { onSite, assigned })}
                </p>
                <dl className="grid grid-cols-2 gap-2 text-sm [&>div]:rounded-2xl [&>div]:bg-surface-2 [&>div]:p-3">
                  <div>
                    <dt className="text-ink-2">{t("rules")}</dt>
                    <dd>
                      {t("rulesValue", {
                        daily: profile.labourRules.dailyHrs,
                        weekly: profile.labourRules.weeklyHrs,
                        ot: profile.labourRules.otMultiplier,
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-2">{t("geofence")}</dt>
                    <dd>{site.geofence ? t("geofenceValue", { radius: site.geofence.radiusM }) : t("noGeofence")}</dd>
                  </div>
                </dl>
                <div>
                  <p className="mb-1 text-sm text-ink-2">{t("hazardTypes")}</p>
                  <ul className="flex flex-wrap gap-1">
                    {profile.hazardCategories.map((c) => (
                      <li key={c}>
                        <Badge>{tr(`categories.${c}`)}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  href={`/a/kiosk/${site.id}`}
                  className={buttonVariants({ size: "sm", variant: "primary", className: "mt-auto w-fit" })}
                >
                  <QrCode aria-hidden="true" className="size-4" />
                  {t("openKiosk")}
                </Link>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
