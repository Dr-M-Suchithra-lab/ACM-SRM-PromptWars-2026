"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CircleCheck, Hand, Megaphone, MessageSquareReply, Plus, ShieldCheck } from "lucide-react";
import { raiseIssueAction, signIssueAction, similarIssuesAction } from "@/server/actions/issues";
import { K_ANONYMITY } from "@/core/anonymity";
import type { IssueStatus } from "@/core/cosign";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { SpeakButton } from "@/components/speak-button";
import { DictateButton } from "./dictate-button";

export interface IssueView {
  id: string;
  text: string;
  signerCount: number;
  status: IssueStatus;
  response?: string;
  signed: boolean;
  needed: number;
}

const STATUS_TONE = { gathering: "neutral", escalated: "warning", acknowledged: "info", resolved: "success" } as const;

/** Five dots: how many have signed out of the five needed before management can see the issue. */
function SignatureDots({ count }: { count: number }) {
  return (
    <span aria-hidden="true" className="flex gap-1">
      {Array.from({ length: K_ANONYMITY }, (_, i) => (
        <span key={i} className={cn("size-2.5 rounded-full", i < count ? "bg-primary" : "bg-line")} />
      ))}
    </span>
  );
}

function IssueCard({ issue, onSign, pending }: { issue: IssueView; onSign: (id: string) => void; pending: boolean }) {
  const t = useTranslations("issues");
  const gathering = issue.status === "gathering";
  return (
    <li className="card flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-bold">{issue.text}</p>
        <SpeakButton text={issue.text} className="-mt-1 shrink-0" />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {gathering ? (
          <>
            <SignatureDots count={issue.signerCount} />
            <span className="figure font-semibold text-ink-2">
              {t("needed", { count: issue.signerCount, k: K_ANONYMITY })}
            </span>
          </>
        ) : (
          <Badge tone={STATUS_TONE[issue.status]}>
            {issue.status === "resolved" ? (
              <CircleCheck aria-hidden="true" className="size-4" />
            ) : (
              <Megaphone aria-hidden="true" className="size-4" />
            )}
            {t(`status.${issue.status}`, { count: issue.signerCount })}
          </Badge>
        )}
      </div>
      {issue.response && (
        <p className="flex gap-2 rounded-2xl bg-info-soft px-3 py-2">
          <MessageSquareReply aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#2558b5]" />
          <span>
            <span className="block text-sm font-bold">{t("managementReply")}</span>
            {issue.response}
          </span>
        </p>
      )}
      {issue.status !== "resolved" &&
        (issue.signed ? (
          <p className="flex items-center gap-2 text-sm font-bold text-success">
            <CircleCheck aria-hidden="true" className="size-5" />
            {t("youSigned")}
          </p>
        ) : (
          <Button variant="secondary" onClick={() => onSign(issue.id)} disabled={pending} className="w-full sm:w-fit">
            <Hand aria-hidden="true" className="size-5" />
            {t("meToo")}
          </Button>
        ))}
    </li>
  );
}

/** "Safe in numbers": issues gain strength anonymously before management ever sees them. */
export function SiteIssues({ issues }: { issues: IssueView[] }) {
  const t = useTranslations("issues");
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [composing, setComposing] = useState(false);
  const [similar, setSimilar] = useState<IssueView[] | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function sign(id: string) {
    setError("");
    startTransition(async () => {
      const result = await signIssueAction(id);
      if (!result.ok) return setError(t(`errors.${result.error === "rate_limited" ? "rate_limited" : "general"}`));
      toast.success(result.escalated ? t("escalatedToast", { k: K_ANONYMITY }) : t("signedToast"));
      setSimilar(null);
      setComposing(false);
      setDraft("");
      router.refresh();
    });
  }

  /** Step 1: before creating, show issues that already say the same thing. */
  function next() {
    setError("");
    startTransition(async () => {
      const ids = await similarIssuesAction(draft);
      const matches = issues.filter((i) => ids.includes(i.id));
      if (matches.length) setSimilar(matches);
      else raise();
    });
  }

  function raise() {
    startTransition(async () => {
      const result = await raiseIssueAction(draft);
      if (!result.ok) return setError(t(`errors.${result.error === "rate_limited" ? "rate_limited" : "invalid"}`));
      toast.success(t("raisedToast"));
      setSimilar(null);
      setComposing(false);
      setDraft("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="card flex items-start gap-3 bg-primary-soft/60 p-4 text-sm">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
        {t("privacy", { k: K_ANONYMITY })}
      </p>

      {error && (
        <p role="alert" className="rounded-2xl bg-danger-soft p-3 font-semibold text-danger">
          {error}
        </p>
      )}

      {similar ? (
        <section aria-labelledby="similar-title" className="flex flex-col gap-3" aria-live="polite">
          <h2 id="similar-title" className="font-display text-2xl font-extrabold">
            {t("isItOneOfThese")}
          </h2>
          <ul className="flex flex-col gap-3">
            {similar.map((issue) => (
              <IssueCard key={issue.id} issue={issue} onSign={sign} pending={pending} />
            ))}
          </ul>
          <Button variant="outline" size="lg" onClick={raise} disabled={pending}>
            {t("noMineIsDifferent")}
          </Button>
        </section>
      ) : composing ? (
        <section aria-labelledby="new-issue" className="card flex flex-col gap-3 p-4">
          <label id="new-issue" htmlFor="issue-text" className="font-bold">
            {t("newLabel")}
          </label>
          <div className="flex items-start gap-2">
            <Textarea
              id="issue-text"
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 300))}
              rows={3}
              maxLength={300}
            />
            <DictateButton onText={(text) => setDraft((d) => (d ? `${d} ${text}` : text).slice(0, 300))} />
          </div>
          <p className="text-sm text-ink-2">{t("newHint")}</p>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setComposing(false)} disabled={pending}>
              {t("cancel")}
            </Button>
            <Button onClick={next} disabled={pending || draft.trim().length < 5} aria-busy={pending || undefined}>
              {t("next")}
            </Button>
          </div>
        </section>
      ) : (
        <Button size="lg" onClick={() => setComposing(true)}>
          <Plus aria-hidden="true" className="size-5" />
          {t("raise")}
        </Button>
      )}

      {!similar && (
        <ul className="stagger flex flex-col gap-3">
          {issues.length === 0 && <li className="text-ink-2">{t("empty")}</li>}
          {issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} onSign={sign} pending={pending} />
          ))}
        </ul>
      )}
    </div>
  );
}
