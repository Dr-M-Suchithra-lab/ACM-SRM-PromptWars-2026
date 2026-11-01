"use client";

import { useEffect, useId, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, ChevronDown, Languages, Loader2 } from "lucide-react";
import { setLocaleAction } from "@/server/actions/auth";
import { LANGUAGE_LABELS, locales, type Locale } from "@/i18n/locales";
import { cn } from "@/lib/utils";

/**
 * Language dropdown (WAI-ARIA menu with radio items): native script + English name, check on
 * the current one. Arrow keys / Home / End move, Enter or Space picks, Escape closes, focus is
 * trapped inside while open. Changing language updates the cookie and <html lang> and
 * refreshes in place — it never adds a browser history entry.
 * `side="top"` opens it upward, for a menu pinned to the bottom of a full-height rail.
 */
export function LanguageMenu({ className, side = "bottom" }: { className?: string; side?: "top" | "bottom" }) {
  const t = useTranslations("a11y");
  const current = useLocale() as Locale;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    items.current[locales.indexOf(current)]?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, current]);

  function close(returnFocus = true) {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  }

  function choose(locale: Locale) {
    close();
    if (locale === current) return;
    startTransition(async () => {
      await setLocaleAction(locale);
      document.documentElement.lang = locale;
      router.refresh();
    });
  }

  function onMenuKeyDown(event: KeyboardEvent) {
    const index = items.current.findIndex((el) => el === document.activeElement);
    const focusAt = (i: number) => items.current[(i + locales.length) % locales.length]?.focus();
    switch (event.key) {
      case "ArrowDown":
        focusAt(index + 1);
        break;
      case "ArrowUp":
        focusAt(index - 1);
        break;
      case "Home":
        focusAt(0);
        break;
      case "End":
        focusAt(locales.length - 1);
        break;
      case "Tab": // keep focus inside while open
        focusAt(index + (event.shiftKey ? -1 : 1));
        break;
      case "Escape":
        close();
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  return (
    <div ref={root} className={cn("relative", className)}>
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={t("languageSwitch")}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="press flex min-h-12 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-sm font-bold text-ink shadow-[var(--shadow-card)] hover:border-primary/40"
      >
        {pending ? (
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <Languages aria-hidden="true" className="size-4 text-primary" />
        )}
        <span lang={current}>{LANGUAGE_LABELS[current].native}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn("size-4 transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      <div
        id={menuId}
        role="menu"
        aria-label={t("languageSwitch")}
        hidden={!open}
        onKeyDown={onMenuKeyDown}
        className={cn(
          "menu-pop absolute z-50 w-56 rounded-2xl border border-line bg-surface p-1.5 shadow-[var(--shadow-lift)]",
          side === "top" ? "bottom-full left-0 mb-2 origin-bottom-left" : "top-full right-0 mt-2 origin-top-right",
        )}
      >
        {locales.map((locale, i) => {
          const selected = locale === current;
          return (
            <button
              key={locale}
              ref={(el) => {
                items.current[i] = el;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={selected}
              tabIndex={-1}
              onClick={() => choose(locale)}
              className={cn(
                "flex min-h-12 w-full items-center gap-2 rounded-xl px-3 text-left transition-colors hover:bg-surface-2 focus-visible:bg-surface-2",
                selected && "bg-primary-soft text-primary-strong hover:bg-primary-soft",
              )}
            >
              <span lang={locale} className="font-bold">
                {LANGUAGE_LABELS[locale].native}
              </span>
              {locale !== "en" && <span className="text-sm text-ink-2">· {LANGUAGE_LABELS[locale].english}</span>}
              {selected && <Check aria-hidden="true" className="ml-auto size-5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
