"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const TABS = ["feel", "issues"] as const;
type Tab = (typeof TABS)[number];

/**
 * Two tabs on one page: "How is work?" and "Issues at your site". Switching is local state
 * (never a history entry). Arrow keys move between tabs (WAI-ARIA tabs pattern).
 */
export function SpeakUpTabs({ feel, issues, issueCount }: { feel: ReactNode; issues: ReactNode; issueCount: number }) {
  const t = useTranslations("feedback.tabs");
  const [tab, setTab] = useState<Tab>("feel");
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const next = TABS[(TABS.indexOf(tab) + 1) % TABS.length];
    setTab(next);
    refs.current[TABS.indexOf(next)]?.focus();
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label={t("label")}
        onKeyDown={onKeyDown}
        className="grid grid-cols-2 gap-1 rounded-full border border-line bg-surface p-1"
      >
        {TABS.map((value, i) => (
          <button
            key={value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${value}`}
            aria-selected={tab === value}
            aria-controls={`panel-${value}`}
            tabIndex={tab === value ? 0 : -1}
            onClick={() => setTab(value)}
            className={cn(
              "flex min-h-12 items-center justify-center gap-2 rounded-full text-sm font-bold transition-colors",
              tab === value ? "bg-primary text-on-primary" : "text-ink-2 hover:bg-surface-2",
            )}
          >
            {t(value)}
            {value === "issues" && issueCount > 0 && (
              <span className={cn("figure rounded-full px-2 text-xs", tab === value ? "bg-white/25" : "bg-surface-2")}>
                {issueCount}
              </span>
            )}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "feel" ? feel : issues}
      </div>
    </div>
  );
}
