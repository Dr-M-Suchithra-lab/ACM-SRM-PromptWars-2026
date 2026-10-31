"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { HelpCircle, Sparkles } from "lucide-react";
import { explainPayAction } from "@/server/actions/pay";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SpeakButton } from "@/components/speak-button";

/** "Why this amount?": template sentences first, optional AI rewording on request. */
export function ExplainPay({ month, sentences }: { month: string; sentences: string[] }) {
  const t = useTranslations("pay");
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState(sentences);
  const [aiResult, setAiResult] = useState<"none" | "ok" | "unavailable">("none");
  const [pending, startTransition] = useTransition();

  function explainMore() {
    startTransition(async () => {
      const better = await explainPayAction(month);
      if (better) setLines(better);
      setAiResult(better ? "ok" : "unavailable");
    });
  }

  if (!open) {
    return (
      <Button variant="outline" size="lg" className="w-full" onClick={() => setOpen(true)}>
        <HelpCircle aria-hidden="true" className="size-6" />
        {t("whyThisAmount")}
      </Button>
    );
  }

  return (
    <Card className="rise-in flex flex-col gap-4" aria-live="polite">
      <div className="flex items-center justify-between">
        <h2 className="font-display flex items-center gap-2 text-xl font-extrabold">
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent-soft text-warning-ink">
            <HelpCircle aria-hidden="true" className="size-5" />
          </span>
          {t("whyThisAmount")}
        </h2>
        <SpeakButton text={lines.join(" ")} />
      </div>
      <ol className="flex flex-col gap-2">
        {lines.map((line, i) => (
          <li key={line} className="flex gap-3">
            <span
              aria-hidden="true"
              className="figure mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-bold"
            >
              {i + 1}
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ol>
      {aiResult === "unavailable" && (
        <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink-2">{t("aiUnavailable")}</p>
      )}
      {aiResult === "ok" && <p className="text-sm text-ink-2">{t("aiReworded")}</p>}
      {aiResult === "none" && (
        <Button variant="outline" onClick={explainMore} disabled={pending}>
          <Sparkles aria-hidden="true" className="size-5" />
          {pending ? t("thinking") : t("explainMore")}
        </Button>
      )}
    </Card>
  );
}
