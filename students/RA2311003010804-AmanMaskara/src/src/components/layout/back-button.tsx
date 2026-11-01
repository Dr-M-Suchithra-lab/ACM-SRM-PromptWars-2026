"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { ROOT_PAGES } from "@/core/nav-stack";
import { useNavigation } from "@/components/providers/navigation-provider";
import { cn } from "@/lib/utils";

/** App-style Back: the last page opened in FairShift, or the page above when opened from a link. */
export function BackButton({ className }: { className?: string }) {
  const t = useTranslations("common");
  const pathname = usePathname();
  const { goBack } = useNavigation();
  if ((ROOT_PAGES as readonly string[]).includes(pathname)) return null;

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={t("back")}
      className={cn(
        "press flex size-12 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-[var(--shadow-card)] hover:border-primary/40",
        className,
      )}
    >
      <ArrowLeft aria-hidden="true" className="size-5" />
    </button>
  );
}
