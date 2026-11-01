import Link from "next/link";
import { requireRole } from "@/server/dal";
import { LanguageMenu } from "@/components/language-menu";
import { BackButton } from "@/components/layout/back-button";
import { BottomNav, TopNav } from "@/components/worker/bottom-nav";
import { OfflineSync } from "@/components/worker/offline-sync";
import { BrandMark } from "@/components/brand-mark";

export default async function WorkerLayout({ children }: LayoutProps<"/w">) {
  await requireRole("worker");

  return (
    <div className="worker flex min-h-dvh flex-col">
      {/* Persistent: named so page transitions slide the content, never the header. */}
      <header
        style={{ viewTransitionName: "app-header" }}
        className="sticky top-0 z-30 border-b border-line/70 bg-paper/90 backdrop-blur"
      >
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-2 md:max-w-5xl md:px-8">
          <BackButton />
          <Link href="/w" className="rounded-xl">
            <BrandMark className="text-[1.35rem]" />
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <TopNav />
            <LanguageMenu />
          </div>
        </div>
      </header>
      <OfflineSync />
      {/* Bottom padding keeps the last item clear of the floating tab bar (and Android's gesture bar). */}
      <main
        id="main"
        className="mx-auto w-full max-w-md flex-1 px-4 pt-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:max-w-5xl md:px-8 md:pt-10 md:pb-16"
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
