"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, Lock, Phone, Siren, Sparkles } from "lucide-react";
import { askHelpAction } from "@/server/actions/help";
import type { HelpResult } from "@/ai/help";
import { getHelpline } from "@/config/helplines";
import type { HelpAction } from "@/core/help-triage";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { SpeakButton } from "@/components/speak-button";
import { DictateButton } from "@/components/worker/dictate-button";

const ACTION_HREF: Record<Exclude<HelpAction, "none">, string> = {
  report_hazard: "/w/report",
  check_pay: "/w/pay",
  speak_up: "/w/feedback",
  benefits: "/w/skills#benefits",
};

const URGENCY_TONE = { emergency: "solidDanger", urgent: "danger", normal: "info" } as const;

/** Describe the problem (typed or spoken) → next steps, the right helplines, and where in FairShift to act. */
export function HelpAssistant() {
  const t = useTranslations("help");
  const [text, setText] = useState("");
  const [result, setResult] = useState<HelpResult | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function ask(problem = text) {
    if (problem.trim().length < 3) return;
    setError("");
    startTransition(async () => {
      const answer = await askHelpAction(problem);
      if ("error" in answer) {
        setError(t(answer.error === "rate_limited" ? "errors.rateLimited" : "errors.general"));
        return;
      }
      setResult(answer);
    });
  }

  // Gemini writes the steps; without it, plain steps for the topic in the worker's language.
  const steps = result
    ? result.steps.length
      ? result.steps
      : (t.raw(`fallbackSteps.${result.topic}`) as string[])
    : [];

  return (
    <section aria-labelledby="ask-title" className="card flex flex-col gap-4 p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary-strong">
          <Sparkles aria-hidden="true" className="size-6" />
        </span>
        <div>
          <h2 id="ask-title" className="font-display text-2xl font-extrabold">
            {t("askTitle")}
          </h2>
          <p className="text-sm text-ink-2">{t("askHint")}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="help-text">{t("label")}</Label>
        <div className="flex items-start gap-2">
          <Textarea
            id="help-text"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 800))}
            rows={3}
            placeholder={t("placeholder")}
            className="flex-1"
          />
          <DictateButton
            onText={(spoken) => {
              const next = `${text} ${spoken}`.trim();
              setText(next);
              ask(next);
            }}
          />
        </div>
        <p className="flex items-center gap-1.5 text-sm text-ink-2">
          <Lock aria-hidden="true" className="size-4" />
          {t("private")}
        </p>
      </div>
      <Button
        size="lg"
        onClick={() => ask()}
        disabled={pending || text.trim().length < 3}
        aria-busy={pending || undefined}
      >
        <Sparkles aria-hidden="true" className="size-5" />
        {pending ? t("thinking") : t("ask")}
      </Button>
      {error && (
        <p role="alert" className="rounded-2xl bg-danger-soft p-3 font-semibold text-danger">
          {error}
        </p>
      )}

      {result && (
        <div
          aria-live="polite"
          className={cn(
            "rise-in flex flex-col gap-3 rounded-2xl border p-4",
            result.urgency === "emergency" ? "border-danger bg-danger-soft" : "border-line",
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <Badge tone={URGENCY_TONE[result.urgency]}>
              {result.urgency === "emergency" && <Siren aria-hidden="true" className="size-4" />}
              {t(`urgency.${result.urgency}`)}
            </Badge>
            <SpeakButton text={steps.join(" ")} />
          </div>
          <ol className="flex list-decimal flex-col gap-2 pl-5 font-semibold">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          {result.helplines.length > 0 && (
            <ul className="flex flex-col gap-2">
              {result.helplines.map((id) => {
                const line = getHelpline(id);
                return (
                  <li key={id}>
                    <a
                      href={`tel:${line.dial}`}
                      className={cn(
                        buttonVariants({ variant: line.kind === "emergency" ? "danger" : "secondary", size: "lg" }),
                        "w-full justify-between",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Phone aria-hidden="true" className="size-5" />
                        {t(`lines.${id}.name`)}
                      </span>
                      <span className="figure">{line.number}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
          {result.action !== "none" && (
            <Link href={ACTION_HREF[result.action]} className={cn(buttonVariants({ variant: "ghost" }), "w-fit")}>
              {t(`actions.${result.action}`)}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          )}
          <p className="text-xs text-ink-2">{t(result.source === "gemini" ? "sourceAi" : "sourceRules")}</p>
        </div>
      )}
    </section>
  );
}
