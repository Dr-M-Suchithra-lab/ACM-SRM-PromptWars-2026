"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { submitFeedbackAction } from "@/server/actions/feedback";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { SpeakButton } from "@/components/speak-button";
import { SuccessCheck } from "@/components/success-check";
import { DictateButton } from "./dictate-button";
import { FacePicker, type FaceValue } from "./feedback-faces";

const QUESTIONS = [
  { key: "pay", label: "question1" },
  { key: "safety", label: "question2" },
  { key: "respect", label: "question3" },
] as const;

type Answers = Partial<Record<(typeof QUESTIONS)[number]["key"], FaceValue>>;

export function FeedbackForm() {
  const t = useTranslations("feedback");
  const [answers, setAnswers] = useState<Answers>({});
  const [comment, setComment] = useState("");
  const [result, setResult] = useState<"thanks" | "already" | null>(null);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const complete = QUESTIONS.every((q) => answers[q.key]);

  function submit() {
    startTransition(async () => {
      const response = await submitFeedbackAction({ ...answers, comment: comment || undefined });
      if (response.ok) setResult("thanks");
      else if (response.error === "already_answered") setResult("already");
      else setError(true);
    });
  }

  if (result) {
    const text = t(result === "thanks" ? "thanks" : "alreadyAnswered");
    return (
      <div
        role="status"
        aria-live="polite"
        className="card rise-in flex flex-col items-center gap-3 px-5 py-8 text-center"
      >
        <SuccessCheck className="size-20" />
        <p className="font-display text-2xl font-extrabold">{text}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="rounded-2xl bg-danger-soft p-4 font-semibold text-danger">
          {t("error")}
        </p>
      )}
      {QUESTIONS.map((q, i) => (
        <section key={q.key} aria-labelledby={`q-${q.key}`} className="card p-4 pt-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 id={`q-${q.key}`} className="flex items-center gap-3 text-lg leading-snug font-extrabold">
              <span
                aria-hidden="true"
                className="figure flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm"
              >
                {i + 1}
              </span>
              {t(q.label)}
            </h2>
            <SpeakButton text={t(q.label)} />
          </div>
          <FacePicker
            label={t(q.label)}
            value={answers[q.key]}
            onChange={(value) => setAnswers((prev) => ({ ...prev, [q.key]: value }))}
            faceLabel={(mood) => t(`faces.${mood}`)}
          />
        </section>
      ))}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="feedback-comment" className="font-bold">
          {t("addComment")}
        </label>
        <div className="flex items-start gap-2">
          <Textarea
            id="feedback-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            rows={3}
          />
          <DictateButton onText={(text) => setComment((c) => (c ? `${c} ${text}` : text).slice(0, 500))} />
        </div>
        <span className="text-sm text-ink-2">{t("commentHint")}</span>
      </div>
      <Button size="lg" onClick={submit} disabled={!complete || pending} aria-busy={pending || undefined}>
        {t("submit")}
      </Button>
    </div>
  );
}
