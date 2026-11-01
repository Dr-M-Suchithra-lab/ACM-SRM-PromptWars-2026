import type { ReactNode } from "react";
import { RevealText } from "@/components/reveal-text";

/** Masthead used on every inner page: small label, big title, optional action (e.g. read-aloud). */
export function PageHeader({
  eyebrow,
  title,
  action,
  children,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="min-w-0 font-display text-[2.1rem] leading-[1.02] font-extrabold md:text-5xl">
          <RevealText text={title} />
        </h1>
        {action && <div className="max-w-full">{action}</div>}
      </div>
      {children && <div className="max-w-prose text-ink-2">{children}</div>}
    </header>
  );
}

/** Today's date in IST, e.g. "Tue, 27 Oct". */
export function todayLabel(locale: string): string {
  const tag = { en: "en-IN", hi: "hi-IN", ta: "ta-IN", te: "te-IN" }[locale] ?? "en-IN";
  return new Intl.DateTimeFormat(tag, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date());
}
