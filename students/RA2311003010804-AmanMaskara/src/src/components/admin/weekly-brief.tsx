"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { weeklyBriefAction } from "@/server/actions/brief";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function WeeklyBrief() {
  const t = useTranslations("admin.brief");
  const [brief, setBrief] = useState<{ points: string[]; source: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card className="flex flex-col gap-3 border-ink/30 p-4 md:p-5" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display flex items-center gap-2 text-lg font-extrabold">
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-ink">
            <Sparkles aria-hidden="true" className="size-5" />
          </span>
          {t("title")}
        </h2>
        <Button
          size="sm"
          onClick={() => startTransition(async () => setBrief(await weeklyBriefAction()))}
          disabled={pending}
        >
          {pending ? t("working") : brief ? t("refresh") : t("generate")}
        </Button>
      </div>
      <p className="text-sm text-ink-2">{t("privacy")}</p>
      {brief && (
        <>
          <ul className="flex list-disc flex-col gap-1 rounded-2xl bg-surface-2 p-4 pl-8">
            {brief.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <Badge className="w-fit">{brief.source === "gemini" ? t("byGemini") : t("byTemplate")}</Badge>
        </>
      )}
    </Card>
  );
}
