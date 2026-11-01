"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { BadgeCheck, CircleCheck, ExternalLink, FileText, Hourglass, ListChecks, X } from "lucide-react";
import { requestCertificateAction } from "@/server/actions/benefits";
import type { ConditionId } from "@/config/schemes";
import type { CertificateStatus } from "@/server/repos/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { SpeakButton } from "@/components/speak-button";

export interface BenefitCard {
  schemeId: string;
  name: string;
  summary: string;
  benefits: string[];
  documents: string[];
  howToApply: string;
  officialLink: string;
  source: string;
  needsWorkCertificate: boolean;
  conditions: ConditionId[];
  done: number;
  needed: number;
  daysRemaining: number;
  wageTooHigh: boolean;
  certificate?: { status: CertificateStatus; url?: string };
}

/** Answers stay on this phone only (localStorage): FairShift never stores age or date of birth. */
const ANSWERS_KEY = "fs-benefit-answers";
type Answers = Partial<Record<ConditionId, boolean>>;

const ANSWERS_EVENT = "fs-benefit-answers";

function readRaw(): string {
  try {
    return localStorage.getItem(ANSWERS_KEY) ?? "{}";
  } catch {
    return "{}";
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(ANSWERS_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(ANSWERS_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function parseAnswers(raw: string): Answers {
  try {
    return JSON.parse(raw) as Answers;
  } catch {
    return {};
  }
}

/** Days done out of days needed, as a ring (SVG stroke, no animation library). */
function ProgressRing({ done, needed, label }: { done: number; needed: number; label: string }) {
  const r = 26;
  const circumference = 2 * Math.PI * r;
  const share = needed ? Math.min(1, done / needed) : 1;
  return (
    <div className="relative size-20 shrink-0" role="img" aria-label={label}>
      <svg viewBox="0 0 64 64" className="size-20 -rotate-90" aria-hidden="true">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="7" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={share >= 1 ? "var(--success)" : "var(--primary)"}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - share)}
          className="ring-progress"
        />
      </svg>
      <span
        aria-hidden="true"
        className="figure absolute inset-0 flex flex-col items-center justify-center leading-none"
      >
        <span className="text-lg font-extrabold">{done}</span>
        <span className="text-[0.7rem] text-ink-2">/ {needed}</span>
      </span>
    </div>
  );
}

function Scheme({
  card,
  answers,
  onAnswer,
}: {
  card: BenefitCard;
  answers: Answers;
  onAnswer: (c: ConditionId, v: boolean) => void;
}) {
  const t = useTranslations("benefits");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const unanswered = card.conditions.filter((c) => answers[c] === undefined);
  const ruledOut = card.wageTooHigh || card.conditions.some((c) => answers[c] === false);
  const daysMet = card.daysRemaining === 0;
  const eligible = daysMet && !ruledOut && unanswered.length === 0;
  const progressLabel = card.needed > 1 ? t("progress", { done: card.done, needed: card.needed }) : "";
  const statusText = ruledOut
    ? t("status.notEligible")
    : eligible
      ? t("status.eligible")
      : daysMet
        ? t("status.answer")
        : t("status.daysLeft", { count: card.daysRemaining });

  function requestCertificate() {
    setError("");
    startTransition(async () => {
      const result = await requestCertificateAction(card.schemeId);
      if (result.ok) router.refresh();
      else setError(t("certificate.error"));
    });
  }

  return (
    <li className="card flex flex-col gap-4 p-4 md:p-5">
      <div className="flex items-start gap-4">
        {card.needed > 1 ? (
          <ProgressRing done={card.done} needed={card.needed} label={progressLabel} />
        ) : (
          <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
            <BadgeCheck aria-hidden="true" className="size-9" />
          </span>
        )}
        <div className="flex flex-1 flex-col gap-1">
          <h3 className="text-lg leading-tight font-extrabold">{card.name}</h3>
          <p className="text-ink-2">{card.summary}</p>
          <Badge tone={ruledOut ? "neutral" : eligible ? "success" : "warning"} className="mt-1 w-fit">
            {eligible ? (
              <CircleCheck aria-hidden="true" className="size-4" />
            ) : ruledOut ? (
              <X aria-hidden="true" className="size-4" />
            ) : (
              <Hourglass aria-hidden="true" className="size-4" />
            )}
            {statusText}
          </Badge>
        </div>
        <SpeakButton
          text={[card.name, card.summary, progressLabel, statusText].filter(Boolean).join(". ")}
          className="shrink-0"
        />
      </div>

      {!ruledOut && daysMet && unanswered.length > 0 && (
        <div className="flex flex-col gap-2 rounded-2xl bg-surface-2/70 p-3">
          {unanswered.map((condition) => (
            <fieldset key={condition} className="flex flex-col gap-2">
              <legend className="font-bold">{t(`conditions.${condition}`)}</legend>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => onAnswer(condition, true)}>
                  {t("yes")}
                </Button>
                <Button variant="outline" onClick={() => onAnswer(condition, false)}>
                  {t("no")}
                </Button>
              </div>
            </fieldset>
          ))}
          <p className="text-sm text-ink-2">{t("answersPrivate")}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setOpen(true)}>
          <ListChecks aria-hidden="true" className="size-5" />
          {t("howToApply")}
        </Button>
        {card.needsWorkCertificate &&
          daysMet &&
          !card.wageTooHigh &&
          (card.certificate?.status === "approved" && card.certificate.url ? (
            <a
              href={card.certificate.url}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-success px-5 font-bold text-white"
            >
              <FileText aria-hidden="true" className="size-5" />
              {t("certificate.open")}
            </a>
          ) : card.certificate?.status === "requested" ? (
            <Badge tone="info" className="min-h-12 px-4">
              <Hourglass aria-hidden="true" className="size-4" />
              {t("certificate.requested")}
            </Badge>
          ) : (
            <Button onClick={requestCertificate} disabled={pending} aria-busy={pending || undefined}>
              <FileText aria-hidden="true" className="size-5" />
              {t("certificate.request")}
            </Button>
          ))}
      </div>
      {error && (
        <p role="alert" className="font-semibold text-danger">
          {error}
        </p>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={card.name}>
        <section className="flex flex-col gap-2">
          <h3 className="font-bold">{t("whatYouGet")}</h3>
          <ul className="flex list-disc flex-col gap-1 pl-5">
            {card.benefits.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </section>
        <section className="flex flex-col gap-2">
          <h3 className="font-bold">{t("documents")}</h3>
          <ul className="flex flex-col gap-1.5">
            {card.documents.map((d) => (
              <li key={d} className="flex items-start gap-2">
                <FileText aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary" />
                {d}
              </li>
            ))}
          </ul>
        </section>
        <section className="flex flex-col gap-2">
          <h3 className="font-bold">{t("steps")}</h3>
          <p>{card.howToApply}</p>
          <SpeakButton text={card.howToApply} className="w-fit" />
        </section>
        <a
          href={card.officialLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 w-fit items-center gap-2 rounded-full border border-line px-4 font-bold text-primary"
        >
          <ExternalLink aria-hidden="true" className="size-4" />
          {t("officialSite")}
        </a>
        <p className="text-xs text-ink-2">
          {t("source")}: {card.source}. {t("verifyNote")}
        </p>
      </Sheet>
    </li>
  );
}

export function Benefits({ cards }: { cards: BenefitCard[] }) {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "{}");
  const answers = useMemo(() => parseAnswers(raw), [raw]);

  function onAnswer(condition: ConditionId, value: boolean) {
    try {
      localStorage.setItem(ANSWERS_KEY, JSON.stringify({ ...answers, [condition]: value }));
      window.dispatchEvent(new Event(ANSWERS_EVENT));
    } catch {
      // storage blocked: the question simply stays open
    }
  }

  return (
    <ul className={cn("stagger flex flex-col gap-3")}>
      {cards.map((card) => (
        <Scheme key={card.schemeId} card={card} answers={answers} onAnswer={onAnswer} />
      ))}
    </ul>
  );
}
