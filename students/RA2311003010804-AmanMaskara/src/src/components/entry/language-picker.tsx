"use client";

import { startTransition, useState, ViewTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Check } from "lucide-react";
import { setLocaleAction } from "@/server/actions/auth";
import { LANGUAGE_LABELS, locales, type Locale } from "@/i18n/locales";
import { cn } from "@/lib/utils";
import { SpeakButton } from "@/components/speak-button";

/**
 * Big native-script cards, each with a speaker to hear the language's name. The chosen card
 * morphs into the login card (shared view transition "entry-card").
 */
export function LanguagePicker() {
  const t = useTranslations("a11y");
  const current = useLocale() as Locale;
  const router = useRouter();
  const [chosen, setChosen] = useState<Locale | null>(null);

  function choose(locale: Locale) {
    setChosen(locale);
    navigator.vibrate?.(10);
    startTransition(async () => {
      await setLocaleAction(locale);
      document.documentElement.lang = locale;
      router.push("/login");
    });
  }

  return (
    <ul className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2">
      {locales.map((locale) => {
        const { native, english } = LANGUAGE_LABELS[locale];
        const card = (
          <div
            className={cn(
              // Indic scripts get a taller line height; one fixed minimum keeps all four cards the same size.
              "tile relative flex h-full min-h-36 items-stretch overflow-hidden",
              (chosen ?? current) === locale && "border-primary ring-2 ring-primary/30",
            )}
          >
            <button
              type="button"
              lang={locale}
              onClick={() => choose(locale)}
              disabled={chosen !== null}
              className="press flex flex-1 flex-col items-start justify-between gap-3 p-5 text-left"
            >
              <span className="font-display text-3xl font-extrabold md:text-4xl">{native}</span>
              <span className="flex items-center gap-2 text-sm font-bold text-ink-2" lang="en">
                {english}
                {current === locale ? (
                  <Check aria-hidden="true" className="size-4 text-primary" />
                ) : (
                  <ArrowRight aria-hidden="true" className="nudge size-4" />
                )}
              </span>
            </button>
            <SpeakButton
              text={native}
              lang={locale}
              label={t("hearLanguage", { language: english })}
              className="absolute top-3 right-3"
            />
          </div>
        );
        return (
          <li key={locale}>
            {chosen === locale ? (
              <ViewTransition name="entry-card" share="card-morph" default="none">
                {card}
              </ViewTransition>
            ) : (
              card
            )}
          </li>
        );
      })}
    </ul>
  );
}
