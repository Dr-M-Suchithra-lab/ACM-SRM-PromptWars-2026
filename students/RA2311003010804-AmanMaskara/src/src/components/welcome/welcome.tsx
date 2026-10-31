"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useState,
  ViewTransition,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { LogoMark } from "@/components/brand-mark";
import type { DayPart } from "@/lib/day-part";
import { cn } from "@/lib/utils";

const PLAYED_KEY = "fs-welcome-played";
const DURATION_MS = { worker: 2000, admin: 1300 } as const;
const REDUCED_MS = 200;

type Phase = "playing" | "done";
const WelcomeContext = createContext<Phase>("done");

/** Clear the "already played" flag so the next login plays the welcome again. */
export function resetWelcome(): void {
  try {
    sessionStorage.removeItem(PLAYED_KEY);
  } catch {
    // storage blocked: nothing to reset
  }
}

/**
 * Splits text for the staggered reveal. Latin words animate letter by letter; Indic words stay
 * whole, because separating Devanagari, Tamil or Telugu clusters would break their shaping.
 */
function pieces(text: string): string[][] {
  return text.split(" ").map((word) => (/^[\x20-\x7E]+$/.test(word) ? [...word] : [word]));
}

interface WelcomeProps {
  /** Shown only on the first page after login (`?welcome=1`) */
  active: boolean;
  variant: "worker" | "admin";
  /** Part of the day in IST, chosen on the server so markup matches on hydration */
  part: DayPart;
  greeting: string;
  line: string;
  children: ReactNode;
}

/**
 * The ~2 s welcome after login: the background warms with the time of day, the greeting
 * types in, then the card flies into the page header (a shared-element view transition) as
 * the home cards stagger in. Tap anywhere to skip. Plays once per login session.
 */
export function WelcomeMoment({ active, variant, part, greeting, line, children }: WelcomeProps) {
  const t = useTranslations("welcome");
  const [phase, setPhase] = useState<Phase>(active ? "playing" : "done");

  const finish = useCallback(() => {
    startTransition(() => setPhase("done"));
  }, []);

  useEffect(() => {
    if (!active) return;
    // Drop ?welcome=1 so a refresh or Back never replays it (no new history entry).
    window.history.replaceState(window.history.state, "", window.location.pathname);
    let played = false;
    try {
      played = sessionStorage.getItem(PLAYED_KEY) === "1";
      sessionStorage.setItem(PLAYED_KEY, "1");
    } catch {
      // storage blocked: play once for this page view
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = played ? 0 : reduced ? REDUCED_MS : DURATION_MS[variant];
    const timer = setTimeout(finish, delay);
    return () => clearTimeout(timer);
  }, [active, variant, finish]);

  return (
    <WelcomeContext value={phase}>
      <div data-welcome={phase}>{children}</div>
      {phase === "playing" && (
        <div
          role="status"
          aria-live="polite"
          onClick={finish}
          className={cn(
            "welcome-overlay fixed inset-0 z-[60] flex cursor-pointer items-center justify-center p-6",
            `welcome-${part}`,
          )}
        >
          <ViewTransition
            name={variant === "worker" ? "welcome-greeting" : undefined}
            share="greeting-morph"
            default="none"
          >
            <div
              className={cn(
                "welcome-card flex flex-col items-center gap-4 text-center",
                variant === "admin" && "welcome-card-small",
              )}
            >
              <LogoMark className="size-14" animated />
              <p className="font-display text-[2.6rem] leading-tight font-extrabold md:text-6xl">
                {pieces(greeting).map((word, w) => (
                  <span key={w} className="inline-block whitespace-nowrap">
                    {word.map((piece, p) => (
                      <span key={p} className="welcome-letter" style={{ ["--i" as string]: w * 4 + p }}>
                        {piece}
                      </span>
                    ))}
                    {" "}
                  </span>
                ))}
              </p>
              <p className="welcome-line max-w-md text-lg text-ink-2">{line}</p>
              <span className="sr-only">{t("skip")}</span>
            </div>
          </ViewTransition>
          <button
            type="button"
            onClick={finish}
            className="absolute right-5 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] min-h-12 rounded-full px-4 font-bold text-ink-2"
          >
            {t("skip")}
          </button>
        </div>
      )}
    </WelcomeContext>
  );
}

/** The home heading: hidden while the welcome plays, then it receives the greeting card's morph. */
export function GreetingTitle({ children, className }: { children: ReactNode; className?: string }) {
  const phase = useContext(WelcomeContext);
  if (phase === "playing") {
    return (
      <h1 className={cn(className, "invisible")} aria-hidden="true">
        {children}
      </h1>
    );
  }
  return (
    <ViewTransition name="welcome-greeting" share="greeting-morph" default="none">
      <h1 className={className}>{children}</h1>
    </ViewTransition>
  );
}
