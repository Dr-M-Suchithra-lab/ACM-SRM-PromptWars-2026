"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { HardHat, IndianRupee, LayoutDashboard, MapPin, MessageSquare, QrCode, TriangleAlert } from "lucide-react";
import { PILL_CLASS, useSlidingPill } from "@/components/layout/sliding-pill";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/a", key: "overview", Icon: LayoutDashboard },
  { href: "/a/hazards", key: "hazards", Icon: TriangleAlert },
  { href: "/a/people", key: "people", Icon: HardHat },
  { href: "/a/feedback", key: "feedback", Icon: MessageSquare },
  { href: "/a/payroll", key: "payroll", Icon: IndianRupee },
  { href: "/a/sites", key: "sites", Icon: MapPin },
  { href: "/a/kiosk", key: "kiosk", Icon: QrCode },
] as const;

/** Admin navigation: a vertical rail on laptops, a swipeable strip on phones. The active pill slides. */
export function Sidebar({ variant }: { variant: "rail" | "strip" }) {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const active = ITEMS.findIndex(({ href }) => (href === "/a" ? pathname === "/a" : pathname.startsWith(href)));
  const { listRef, pillStyle } = useSlidingPill(active);
  const rail = variant === "rail";

  return (
    <nav aria-label={t("navLabel")}>
      <ul
        ref={listRef}
        className={cn(
          "relative",
          rail
            ? "flex flex-col gap-1"
            : "no-scrollbar flex snap-x gap-1.5 overflow-x-auto px-4 pb-3 [mask-image:linear-gradient(to_right,black_85%,transparent)]",
        )}
      >
        <li
          aria-hidden="true"
          className={cn(PILL_CLASS, rail ? "rounded-xl bg-primary-soft" : "rounded-full bg-primary")}
          style={pillStyle}
        />
        {ITEMS.map(({ href, key, Icon }, i) => {
          const current = i === active;
          return (
            <li key={href} className="relative snap-start">
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 font-bold whitespace-nowrap transition-colors duration-200",
                  rail ? "min-h-12 rounded-xl px-3" : "min-h-11 rounded-full px-4 text-sm",
                  rail && (current ? "text-primary-strong" : "text-ink-2 hover:bg-surface-2 hover:text-ink"),
                  !rail && (current ? "text-on-primary" : "bg-surface text-ink-2 hover:text-ink"),
                )}
              >
                <Icon aria-hidden="true" className={rail ? "size-5" : "size-4"} />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
