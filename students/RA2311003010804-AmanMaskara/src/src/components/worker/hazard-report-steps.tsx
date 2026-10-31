"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Camera, Check, Lock, MapPin, Pencil, Phone, Users } from "lucide-react";
import { maxSeverity, resolveSeverity } from "@/core/hazard-rules";
import { urgencyFromText } from "@/core/hazard-urgency";
import type { HazardCategory, HazardSeverity } from "@/core/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HazardIcon } from "@/components/hazard-icon";
import { SpeakButton } from "@/components/speak-button";

/** What the worker said (or tapped), as understood so far. */
export interface Suggestion {
  category: string;
  severityHint?: HazardSeverity;
  transcript?: string;
  transcriptEn?: string;
  locationHint?: string;
}

const SEVERITY_TONE = { low: "neutral", medium: "warning", high: "danger", critical: "solidDanger" } as const;

/** Step 1 without voice: one big tile per hazard type for this sector. */
export function CategoryGrid({ categories, onPick }: { categories: string[]; onPick: (category: string) => void }) {
  const t = useTranslations("report");
  return (
    <ul className="stagger grid grid-cols-3 gap-2.5">
      {categories.map((category) => (
        <li key={category}>
          <button
            type="button"
            onClick={() => onPick(category)}
            className="tile flex min-h-28 w-full flex-col items-center justify-center gap-2 p-2 text-center text-[0.95rem] leading-tight font-bold"
          >
            <span className="flex size-12 items-center justify-center rounded-2xl bg-danger-soft text-danger">
              <HazardIcon category={category} className="size-7" />
            </span>
            {t(`categories.${category}`)}
          </button>
        </li>
      ))}
    </ul>
  );
}

interface ConfirmStepProps {
  suggestion: Suggestion;
  onSuggestionChange: (next: Suggestion) => void;
  photoAdded: boolean;
  onPhoto: (file: File | undefined) => void;
  hideName: boolean;
  onHideNameChange: (hide: boolean) => void;
  pending: boolean;
  onChange: () => void;
  onSend: () => void;
  errorBox: ReactNode;
}

/** Step 2: read back what was understood, with severity, where, an optional photo and "hide my name". */
export function ConfirmStep({
  suggestion,
  onSuggestionChange,
  photoAdded,
  onPhoto,
  hideName,
  onHideNameChange,
  pending,
  onChange,
  onSend,
  errorBox,
}: ConfirmStepProps) {
  const t = useTranslations("report");
  const heardText = suggestion.transcript ? t("weHeard", { text: suggestion.transcript }) : "";
  const label = t(`categories.${suggestion.category}`);
  // The same rule the server applies, so the worker sees the severity that will be recorded.
  const severity = maxSeverity(
    resolveSeverity(suggestion.category as HazardCategory, suggestion.severityHint),
    urgencyFromText(suggestion.transcript, suggestion.transcriptEn) ?? "low",
  );

  return (
    <div className="flex flex-col gap-4">
      {errorBox}
      <section className="card rise-in flex flex-col gap-4 p-5" aria-live="polite">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-extrabold">{t("confirmTitle")}</h2>
          <SpeakButton text={`${heardText} ${label}`} />
        </div>
        {heardText && <p className="rounded-2xl bg-surface-2 px-4 py-3 italic">{heardText}</p>}
        <p className="flex flex-wrap items-center gap-3 text-xl font-extrabold">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-danger-soft text-danger">
            <HazardIcon category={suggestion.category} className="size-8" />
          </span>
          {label}
          <Badge tone={SEVERITY_TONE[severity]}>{t(`severity.${severity}`)}</Badge>
        </p>
        {severity === "critical" && (
          // Danger to life: calling comes before finishing the report.
          <a
            href="tel:112"
            className="press flex min-h-14 items-center justify-center gap-2 rounded-[18px] bg-danger px-5 text-lg font-bold text-white"
          >
            <Phone aria-hidden="true" className="size-5" />
            {t("callNow")}
          </a>
        )}
        <label className="flex flex-col gap-1.5 font-bold">
          <span className="flex items-center gap-2">
            <MapPin aria-hidden="true" className="size-4" />
            {t("whereLabel")}
          </span>
          <Input
            value={suggestion.locationHint ?? ""}
            onChange={(e) => onSuggestionChange({ ...suggestion, locationHint: e.target.value.slice(0, 120) })}
            placeholder={t("wherePlaceholder")}
            maxLength={120}
            className="font-normal"
          />
        </label>
      </section>

      <label className="tile flex min-h-14 cursor-pointer items-center gap-3 p-3 font-bold">
        <span className="flex size-10 items-center justify-center rounded-xl bg-surface-2">
          <Camera aria-hidden="true" className="size-5" />
        </span>
        {photoAdded ? t("photoAdded") : t("addPhoto")}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => onPhoto(e.target.files?.[0])}
        />
      </label>

      <label className="tile flex min-h-14 cursor-pointer items-center gap-3 p-3 font-bold">
        <input
          type="checkbox"
          checked={hideName}
          onChange={(e) => onHideNameChange(e.target.checked)}
          className="ml-2 size-6 accent-primary"
        />
        <Lock aria-hidden="true" className="size-5" />
        {t("hideMyName")}
      </label>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" size="lg" onClick={onChange} disabled={pending}>
          <Pencil aria-hidden="true" className="size-5" />
          {t("change")}
        </Button>
        <Button size="lg" onClick={onSend} disabled={pending} aria-busy={pending || undefined}>
          <Check aria-hidden="true" className="size-6" />
          {t("send")}
        </Button>
      </div>
    </div>
  );
}

/** Step 3, only when the same danger is already reported here: add to it, or report a different one. */
export function DuplicateStep({
  count,
  pending,
  onAdd,
  onDifferent,
}: {
  count: number;
  pending: boolean;
  onAdd: () => void;
  onDifferent: () => void;
}) {
  const t = useTranslations("report.duplicate");
  return (
    <section aria-labelledby="dup-title" className="card rise-in flex flex-col gap-4 p-5" aria-live="polite">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-info-soft text-[#2558b5]">
        <Users aria-hidden="true" className="size-6" />
      </span>
      <h2 id="dup-title" className="font-display text-2xl font-extrabold">
        {t("title")}
      </h2>
      <p>{t("body", { count })}</p>
      <p className="flex items-center gap-2 text-sm text-ink-2">
        <Lock aria-hidden="true" className="size-4" />
        {t("private")}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button size="lg" onClick={onAdd} disabled={pending} aria-busy={pending || undefined}>
          <Check aria-hidden="true" className="size-5" />
          {t("add")}
        </Button>
        <Button size="lg" variant="outline" onClick={onDifferent} disabled={pending}>
          {t("different")}
        </Button>
      </div>
    </section>
  );
}
