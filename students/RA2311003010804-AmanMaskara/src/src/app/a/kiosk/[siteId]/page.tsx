import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { kioskTokenAction } from "@/server/actions/attendance";
import { RotatingQr } from "@/components/admin/rotating-qr";

export default async function KioskPage({ params }: PageProps<"/a/kiosk/[siteId]">) {
  const session = await requireRole("admin");
  const { siteId } = await params;
  const site = await getRepos().sites.getById(siteId);
  if (!site || site.orgId !== session.orgId) notFound();
  const t = await getTranslations("kiosk");
  const initialToken = await kioskTokenAction(site.id);

  return (
    <div className="hero-card mx-auto flex max-w-xl flex-col items-center gap-4 rounded-[32px] px-5 py-8 text-center md:py-10">
      <h1 className="font-display text-4xl font-extrabold">{site.name}</h1>
      <p className="text-lg text-ink-2">{t("scanHere")}</p>
      <RotatingQr siteId={site.id} initialToken={initialToken ?? ""} />
    </div>
  );
}
