"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const REFRESH_MS = 60_000;

/**
 * "X of Y on duty". The layout does not re-render between admin pages, so the count is fetched
 * here instead: after every page change, every minute while the tab is visible, and on return.
 */
export function OnDuty({ variant }: { variant: "rail" | "strip" }) {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const [duty, setDuty] = useState<{ onDuty: number; total: number } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = () => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/on-duty", { signal: controller.signal, cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => data && setDuty(data))
        .catch(() => {});
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    document.addEventListener("visibilitychange", load);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [pathname]);

  const label = duty ? t("onDuty", { count: duty.onDuty, total: duty.total }) : null;
  // Until the first answer, an invisible placeholder holds the space so nothing shifts.
  const text = (
    <span aria-hidden={!label || undefined} className={cn("figure transition-opacity", !label && "opacity-0")}>
      {label ?? t("onDuty", { count: 0, total: 0 })}
    </span>
  );

  if (variant === "rail") {
    return (
      <Link
        href="/a/people"
        className="flex items-center gap-2.5 rounded-2xl border border-line px-3 py-2.5 text-sm font-bold hover:bg-surface-2"
      >
        <span className="live-dot" aria-hidden="true" />
        {text}
      </Link>
    );
  }
  return (
    <span className="ml-auto flex shrink-0 items-center gap-1.5 text-sm font-bold text-ink-2">
      <span className="live-dot" aria-hidden="true" />
      {text}
    </span>
  );
}
