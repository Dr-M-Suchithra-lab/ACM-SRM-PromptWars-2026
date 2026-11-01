"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { respondIssueAction } from "@/server/actions/issues";
import type { IssueStatus } from "@/core/cosign";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";

/** Management's answer to a co-signed issue: shown to every worker at the site. */
export function IssueResponse({
  issueId,
  status,
  response,
}: {
  issueId: string;
  status: IssueStatus;
  response?: string;
}) {
  const t = useTranslations("admin.feedbackPage.issues");
  const router = useRouter();
  const [text, setText] = useState(response ?? "");
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  if (status === "resolved") return null;

  function send(next: "acknowledged" | "resolved") {
    setError(false);
    startTransition(async () => {
      const result = await respondIssueAction({ issueId, status: next, response: text });
      if (result.ok) router.refresh();
      else setError(true);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`reply-${issueId}`}>{t("replyLabel")}</Label>
      <Textarea id={`reply-${issueId}`} value={text} onChange={(e) => setText(e.target.value.slice(0, 500))} rows={2} />
      <div className="flex flex-wrap gap-2">
        {status === "escalated" && (
          <Button size="sm" variant="secondary" disabled={pending || !text.trim()} onClick={() => send("acknowledged")}>
            {t("acknowledge")}
          </Button>
        )}
        <Button size="sm" disabled={pending || !text.trim()} onClick={() => send("resolved")}>
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
