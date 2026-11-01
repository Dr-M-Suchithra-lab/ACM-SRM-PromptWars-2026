"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CircleCheck, Clock, Hand, Scale } from "lucide-react";
import { requestPayReviewAction } from "@/server/actions/pay";
import type { DisputeStatus } from "@/server/repos/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SpeakButton } from "@/components/speak-button";

const STEPS: DisputeStatus[] = ["open", "reviewing", "resolved"];

interface Props {
  month: string;
  /** e.g. "₹907" */
  total: string;
  /** One plain-words sentence per finding, with the arithmetic */
  lines: string[];
  dispute?: { status: DisputeStatus; note?: string };
  minimumWageNote?: string;
}

/** "Possible shortfall": never an accusation, always the arithmetic, and one tap to ask for a review. */
export function ShortfallCard({ month, total, lines, dispute, minimumWageNote }: Props) {
  const t = useTranslations("pay.sentinel");
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const title = t("title", { amount: total });

  function requestReview() {
    setError("");
    startTransition(async () => {
      const result = await requestPayReviewAction(month);
      if (result.ok) router.refresh();
      else setError(t(`errors.${result.error === "rate_limited" ? "rate_limited" : "general"}`));
    });
  }

  return (
    <section aria-labelledby="shortfall-title" className="card rise-in flex flex-col gap-4 border-danger/25 p-5 md:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-danger-soft text-danger">
          <Scale aria-hidden="true" className="size-6" />
        </span>
        <div className="flex-1">
          <h2 id="shortfall-title" className="font-display text-2xl leading-tight font-extrabold">
            {title}
          </h2>
          <p className="text-sm text-ink-2">{t("possibleHint")}</p>
        </div>
        <SpeakButton text={[title, ...lines, t("possibleHint")].join(". ")} />
      </div>

      <ul className="flex flex-col gap-2">
        {lines.map((line) => (
          <li key={line} className="figure rounded-2xl bg-danger-soft/60 px-4 py-3 font-semibold">
            {line}
          </li>
        ))}
      </ul>
      {minimumWageNote && <p className="text-sm text-ink-2">{minimumWageNote}</p>}

      {dispute ? (
        <div aria-live="polite" className="flex flex-col gap-3 rounded-2xl border border-line p-4">
          <p className="font-bold">{t("reviewTitle")}</p>
          <ol className="grid grid-cols-3 gap-2 text-center text-sm">
            {STEPS.map((step, i) => {
              const reached = STEPS.indexOf(dispute.status) >= i;
              const Icon = step === "resolved" ? CircleCheck : step === "reviewing" ? Clock : Hand;
              return (
                <li
                  key={step}
                  aria-current={dispute.status === step ? "step" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl px-1 py-2 font-bold",
                    reached ? "bg-primary-soft text-primary-strong" : "bg-surface-2 text-ink-2",
                  )}
                >
                  <Icon aria-hidden="true" className="size-5" />
                  {t(`status.${step}`)}
                </li>
              );
            })}
          </ol>
          {dispute.note && (
            <p className="rounded-xl bg-surface-2 px-3 py-2">{t("employerReply", { note: dispute.note })}</p>
          )}
        </div>
      ) : (
        <>
          <Button size="lg" onClick={requestReview} disabled={pending} aria-busy={pending || undefined}>
            <Hand aria-hidden="true" className="size-5" />
            {t("requestReview")}
          </Button>
          <p className="text-sm text-ink-2">{t("requestHint")}</p>
        </>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 font-semibold text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
