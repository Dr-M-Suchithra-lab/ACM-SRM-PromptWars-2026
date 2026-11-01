import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Building2 } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { Badge } from "@/components/ui/badge";
import { LanguageMenu } from "@/components/language-menu";
import { LogoutButton } from "@/components/logout-button";
import { BackButton } from "@/components/layout/back-button";
import { Sidebar } from "@/components/admin/sidebar";
import { BrandMark } from "@/components/brand-mark";
import { OnDuty } from "@/components/admin/on-duty";

export default async function AdminLayout({ children }: LayoutProps<"/a">) {
  const session = await requireRole("admin");
  const [org, t] = await Promise.all([getRepos().orgs.getById(session.orgId), getTranslations("admin")]);
  const sector = org ? t(`sector.${org.sector}`) : "";

  return (
    <div className="admin flex min-h-dvh flex-col md:flex-row">
      {/* Laptops: a full-height rail. Persistent: page transitions never move it. */}
      <aside
        style={{ viewTransitionName: "app-header" }}
        className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r border-line bg-surface p-4 md:flex [@media(max-height:760px)]:gap-3 [@media(max-height:760px)]:py-3"
      >
        <Link href="/a" className="w-fit shrink-0 rounded-xl px-2 pt-1">
          <BrandMark className="text-xl" />
        </Link>
        {/* Short screens (laptop scaling, taskbar): the middle scrolls so Log out is always on screen. */}
        <div className="-m-1.5 flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-1.5 [@media(max-height:760px)]:gap-3">
          <div className="flex shrink-0 items-center gap-3 rounded-2xl bg-surface-2/70 p-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary">
              <Building2 aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-bold">{org?.name}</p>
              <p className="text-sm text-ink-2">{sector}</p>
            </div>
          </div>
          <OnDuty variant="rail" />
          <Sidebar variant="rail" />
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-line pt-4 [@media(max-height:760px)]:pt-3">
          <LanguageMenu side="top" />
          <LogoutButton variant="ghost" size="sm" />
        </div>
      </aside>

      {/* Phones and tablets: compact header, organisation on its own line, then swipeable tabs. */}
      <header
        style={{ viewTransitionName: "app-header" }}
        className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur md:hidden"
      >
        <div className="flex items-center gap-2 px-4 py-2">
          <BackButton />
          <Link href="/a" className="shrink-0 rounded-xl">
            <BrandMark className="text-lg" />
          </Link>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <LanguageMenu />
            <LogoutButton variant="ghost" size="icon" iconOnly />
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 px-4 pb-2.5">
          <span className="max-w-full min-w-0 truncate font-bold">{org?.name}</span>
          {org && <Badge tone="brand">{sector}</Badge>}
          <OnDuty variant="strip" />
        </div>
        <Sidebar variant="strip" />
      </header>

      <main id="main" className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-4 py-6 md:px-10 md:py-10">
        <div className="mb-4 hidden md:block">
          <BackButton />
        </div>
        {children}
      </main>
    </div>
  );
}
