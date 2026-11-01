"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CircleCheck, Landmark, ShieldAlert, X } from "lucide-react";
import { answerPayoutAccountAction } from "@/server/actions/payouts";
import type { WorkerPayoutAccount } from "@/server/services/payouts";
import { formatWhen } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { SpeakButton } from "@/components/speak-button";

/**
 * When the employer enters or changes a worker's pay account, the worker is asked here whether it is
 * theirs. "No" blocks payments into it, so a worker's pay never moves to a new account without them being asked.
 */
export function BankConfirmCard({ account, employer }: { account: WorkerPayoutAccount; employer: string }) {
  const t = useTranslations("worker.bank");
  const locale = useLocale();
  const router = useRouter();
  const [answered, setAnswered] = useState<"confirmed" | "disputed" | null>(null);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  if (account.status === "confirmed" && !answered) return null;
  const masked = account.masked;

  if (answered === "confirmed") {
    return (
      <p
        role="status"
        className="flex items-center gap-2 rounded-2xl bg-success-soft px-4 py-3 font-semibold text-success"
      >
        <CircleCheck aria-hidden="true" className="size-5 shrink-0" />
        {t("confirmed", { masked })}
      </p>
    );
  }
  if (answered === "disputed" || account.status === "disputed") {
    return (
      <p
        role="status"
        className="flex items-start gap-2 rounded-2xl bg-danger-soft px-4 py-3 font-semibold text-danger"
      >
        <ShieldAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        {t("disputed", { masked })}
      </p>
    );
  }

  const body = t("body", {
    employer,
    masked,
    ifsc: account.ifsc,
    when: formatWhen(account.changedAt, locale),
  });
  const auto = account.usableFrom ? t("autoNote", { when: formatWhen(account.usableFrom, locale) }) : "";

  function answer(confirm: boolean) {
    setError(false);
    startTransition(async () => {
      const result = await answerPayoutAccountAction({ confirm });
      if (result.ok) {
        setAnswered(confirm ? "confirmed" : "disputed");
        router.refresh();
      } else setError(true);
    });
  }

  return (
    <section
      aria-labelledby="bank-confirm-title"
      className="card rise-in flex flex-col gap-4 border-warning/40 bg-warning-soft p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-surface text-warning-ink">
          <Landmark aria-hidden="true" className="size-6" />
        </span>
        <div className="flex-1">
          <h2 id="bank-confirm-title" className="font-display text-xl leading-tight font-extrabold">
            {t("title")}
          </h2>
          <p className="mt-1 text-ink-2">{body}</p>
          {auto && <p className="mt-1 text-sm text-ink-2">{auto}</p>}
        </div>
        <SpeakButton text={`${t("title")} ${body} ${auto}`} className="-mt-1 -mr-1 bg-white/70" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button size="lg" onClick={() => answer(true)} disabled={pending} aria-busy={pending || undefined}>
          <CircleCheck aria-hidden="true" className="size-5" />
          {t("yes")}
        </Button>
        <Button size="lg" variant="outline" onClick={() => answer(false)} disabled={pending}>
          <X aria-hidden="true" className="size-5" />
          {t("no")}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {t("error")}
        </p>
      )}
    </section>
  );
}
