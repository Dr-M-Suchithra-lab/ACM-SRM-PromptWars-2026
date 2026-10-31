import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MapPin, QrCode } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { PageHeader } from "@/components/page-header";

export default async function KioskIndex() {
  const session = await requireRole("admin");
  const t = await getTranslations("kiosk");
  const sites = await getRepos().sites.getByOrg(session.orgId);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")}>{t("intro")}</PageHeader>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sites.map((site) => (
          <li key={site.id}>
            <Link href={`/a/kiosk/${site.id}`} className="tile flex items-center gap-4 rounded-card p-4">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-on-primary">
                <QrCode aria-hidden="true" className="size-7" />
              </span>
              <div>
                <p className="font-bold">{site.name}</p>
                <p className="flex items-center gap-1 text-sm text-ink-2">
                  <MapPin aria-hidden="true" className="size-4" />
                  {t("open")}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
