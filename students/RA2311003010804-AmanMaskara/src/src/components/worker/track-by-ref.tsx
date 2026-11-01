"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { KeyRound } from "lucide-react";
import { trackByRefAction } from "@/server/actions/hazards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Follow an anonymous report from another phone with its private reference (e.g. FS-7KQ2MZ). */
export function TrackByRef() {
  const t = useTranslations("report.track");
  const router = useRouter();
  const [ref, setRef] = useState("");
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(false);
    startTransition(async () => {
      const result = await trackByRefAction(ref);
      if ("hazardId" in result) router.push(`/w/report/${result.hazardId}`);
      else setError(true);
    });
  }

  return (
    <details className="card p-4">
      <summary className="flex min-h-10 cursor-pointer items-center gap-2 font-bold">
        <KeyRound aria-hidden="true" className="size-5 text-primary" />
        {t("title")}
      </summary>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-2">
        <label htmlFor="tracking-ref" className="text-sm text-ink-2">
          {t("hint")}
        </label>
        <div className="flex gap-2">
          <Input
            id="tracking-ref"
            value={ref}
            onChange={(e) => setRef(e.target.value.toUpperCase().slice(0, 9))}
            placeholder="FS-XXXXXX"
            autoComplete="off"
            className="figure tracking-widest"
          />
          <Button type="submit" disabled={pending || ref.length < 9} aria-busy={pending || undefined}>
            {t("open")}
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm font-semibold text-danger">
            {t("notFound")}
          </p>
        )}
      </form>
    </details>
  );
}
