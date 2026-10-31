"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { confirmFixAction } from "@/server/actions/hazards";
import { Button } from "@/components/ui/button";
import { SpeakButton } from "@/components/speak-button";

/** The reporter closes the loop. "No" reopens the report and restarts its deadline. */
export function ConfirmFix({ hazardId }: { hazardId: string }) {
  const t = useTranslations("report.confirm");
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function answer(fixed: boolean) {
    setFailed(false);
    startTransition(async () => {
      const result = await confirmFixAction({ hazardId, fixed });
      if (result.ok) router.refresh();
      else setFailed(true);
    });
  }

  return (
    <section aria-labelledby="confirm-title" className="card flex flex-col gap-4 border-info/30 bg-info-soft p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="confirm-title" className="font-display text-2xl font-extrabold">
            {t("title")}
          </h2>
          <p className="text-ink-2">{t("hint")}</p>
        </div>
        <SpeakButton text={`${t("title")} ${t("hint")}`} className="bg-white/70" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button size="lg" onClick={() => answer(true)} disabled={pending}>
          <ThumbsUp aria-hidden="true" className="size-5" />
          {t("yes")}
        </Button>
        <Button size="lg" variant="danger" onClick={() => answer(false)} disabled={pending}>
          <ThumbsDown aria-hidden="true" className="size-5" />
          {t("no")}
        </Button>
      </div>
      {failed && (
        <p role="alert" className="font-semibold text-danger">
          {t("error")}
        </p>
      )}
    </section>
  );
}
