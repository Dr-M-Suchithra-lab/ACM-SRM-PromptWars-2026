"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { updateDisputeAction } from "@/server/actions/payroll";
import type { DisputeStatus } from "@/server/repos/types";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";

/** Move a pay dispute along: reviewing, then resolved with a note the worker will read. */
export function DisputeControls({ id, status }: { id: string; status: DisputeStatus }) {
  const t = useTranslations("admin.payrollPage.disputes");
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  if (status === "resolved") return null;

  function update(next: "reviewing" | "resolved") {
    setError(false);
    startTransition(async () => {
      const result = await updateDisputeAction({ id, status: next, note: note || undefined });
      if (result.ok) router.refresh();
      else setError(true);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`dispute-${id}`}>{t("noteLabel")}</Label>
      <Textarea id={`dispute-${id}`} value={note} onChange={(e) => setNote(e.target.value.slice(0, 500))} rows={2} />
      <div className="flex flex-wrap gap-2">
        {status === "open" && (
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => update("reviewing")}>
            {t("startReview")}
          </Button>
        )}
        <Button size="sm" disabled={pending || !note.trim()} onClick={() => update("resolved")}>
          {t("resolve")}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {t("error")}
        </p>
      )}
    </div>
  );
}
