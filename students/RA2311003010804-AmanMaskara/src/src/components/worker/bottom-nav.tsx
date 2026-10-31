"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { House, IndianRupee, LifeBuoy, TriangleAlert, UserRound } from "lucide-react";
import { PILL_CLASS, useSlidingPill } from "@/components/layout/sliding-pill";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/w", key: "home", Icon: House },
  { href: "/w/pay", key: "pay", Icon: IndianRupee },
  { href: "/w/report", key: "report", Icon: TriangleAlert },
  { href: "/w/skills", key: "me", Icon: UserRound },
  { href: "/w/help", key: "help", Icon: LifeBuoy },
] as const;

function useActiveIndex(): number {
  const pathname = usePathname();
  return ITEMS.findIndex(({ href }) => (href === "/w" ? pathname === "/w" : pathname.startsWith(href)));
}

/** Phone: a floating tab bar in thumb reach, clear of the gesture bar. Stays put during page transitions. */
export function BottomNav() {
  const t = useTranslations("worker.nav");
  const active = useActiveIndex();
  const { listRef, pillStyle } = useSlidingPill(active);

  return (
    <nav
      aria-label={t("label")}
      style={{ viewTransitionName: "tab-bar" }}
      className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[calc(0.6rem+env(safe-area-inset-bottom))] md:hidden"
    >
      <ul
        ref={listRef}
        className="relative mx-auto grid max-w-md grid-cols-5 gap-1 rounded-[26px] border border-line bg-surface/95 p-1.5 shadow-[0_18px_40px_-18px_rgb(31_29_26/0.35)] backdrop-blur"
      >
        <li aria-hidden="true" className={cn(PILL_CLASS, "rounded-[20px] bg-primary-soft")} style={pillStyle} />
        {ITEMS.map(({ href, key, Icon }, i) => (
          <li key={href} className="relative">
            <Link
              href={href}
              aria-current={i === active ? "page" : undefined}
              className={cn(
                "press flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[20px] text-xs font-bold transition-colors duration-200",
                i === active ? "text-primary-strong" : "text-ink-2 hover:text-ink",
              )}
            >
              <Icon aria-hidden="true" className="size-5" strokeWidth={i === active ? 2.4 : 2} />
              {t(key)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Laptop/tablet: the same destinations inline in the header. */
export function TopNav() {
  const t = useTranslations("worker.nav");
  const active = useActiveIndex();
  const { listRef, pillStyle } = useSlidingPill(active);

  return (
    <nav aria-label={t("label")} className="hidden md:block">
      <ul ref={listRef} className="relative grid grid-cols-5 gap-1 rounded-full border border-line bg-surface p-1">
        <li aria-hidden="true" className={cn(PILL_CLASS, "rounded-full bg-primary")} style={pillStyle} />
        {ITEMS.map(({ href, key, Icon }, i) => (
          <li key={href} className="relative">
            <Link
              href={href}
              aria-current={i === active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold transition-colors duration-200",
                i === active ? "text-on-primary" : "text-ink-2 hover:text-ink",
              )}
            >
              <Icon aria-hidden="true" className="size-4" />
              {t(key)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
