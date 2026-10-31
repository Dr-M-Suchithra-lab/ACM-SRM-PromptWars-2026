"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Camera, Check, Merge, Play, RotateCcw, Split, X } from "lucide-react";
import {
  hazardStatusAction,
  mergeHazardAction,
  unmergeHazardAction,
  type AdminActionState,
} from "@/server/actions/admin";
import { DISMISS_REASONS } from "@/config/hazard-sla";
import type { HazardStatus } from "@/core/types";
import { compressImage } from "@/lib/image";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";

type Dialog = "fix" | "dismiss" | "merge" | null;

interface Props {
  hazardId: string;
  status: HazardStatus;
  /** Open hazards this one could be merged into */
  mergeTargets: { id: string; label: string }[];
  /** Hazards merged into this one, which can be split out again */
  merged: { id: string; label: string }[];
}

export function HazardActions({ hazardId, status, mergeTargets, merged }: Props) {
  const t = useTranslations("admin.hazardsPage");
  const tr = useTranslations("report");
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState<string>("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [target, setTarget] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const open = status === "received" || status === "in_progress";

  function run(action: () => Promise<AdminActionState>) {
    setError("");
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setDialog(null);
        setNote("");
        setReason("");
        setPhoto(undefined);
        router.refresh();
      } else setError(t(`errors.${result.error ?? "invalid"}`));
    });
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    try {
      setPhoto(await compressImage(file));
    } catch {
      setError(t("errors.photo"));
    }
  }

  const errorText = error && (
    <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
      {error}
    </p>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {status === "received" && (
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => run(() => hazardStatusAction({ type: "start", hazardId }))}
          >
            <Play aria-hidden="true" className="size-4" />
            {t("start")}
          </Button>
        )}
        {open && (
          <Button size="sm" disabled={pending} onClick={() => setDialog("fix")}>
            <Check aria-hidden="true" className="size-4" />
            {t("markFixed")}
          </Button>
        )}
        {open && (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => setDialog("dismiss")}>
            <X aria-hidden="true" className="size-4" />
            {t("dismiss")}
          </Button>
        )}
        {open && mergeTargets.length > 0 && (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => setDialog("merge")}>
            <Merge aria-hidden="true" className="size-4" />
            {t("merge")}
          </Button>
        )}
        {status === "dismissed" && (
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => run(() => hazardStatusAction({ type: "reopen", hazardId }))}
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            {t("reopen")}
          </Button>
        )}
        {merged.map((m) => (
          <Button
            key={m.id}
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => unmergeHazardAction({ sourceId: m.id }))}
          >
            <Split aria-hidden="true" className="size-4" />
            {t("unmerge", { label: m.label })}
          </Button>
        ))}
      </div>
      {dialog === null && errorText}

      <Sheet open={dialog === "fix"} onClose={() => setDialog(null)} title={t("fixTitle")}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`fix-${hazardId}`}>{t("fixNoteLabel")}</Label>
          <Textarea
            id={`fix-${hazardId}`}
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            rows={3}
            required
          />
          <p className="text-sm text-ink-2">{t("fixNoteHint")}</p>
        </div>
        <label className="tile flex min-h-12 cursor-pointer items-center gap-3 p-3 font-bold">
          <Camera aria-hidden="true" className="size-5" />
          {photo ? t("afterPhotoAdded") : t("afterPhoto")}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => onPhoto(e.target.files?.[0])}
          />
        </label>
        {errorText}
        <Button
          size="lg"
          disabled={pending || note.trim().length < 3}
          onClick={() => run(() => hazardStatusAction({ type: "fix", hazardId, note, photo }))}
        >
          {t("confirmFixed")}
        </Button>
      </Sheet>

      <Sheet open={dialog === "dismiss"} onClose={() => setDialog(null)} title={t("dismissTitle")}>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-bold">{t("dismissReasonLabel")}</legend>
          {DISMISS_REASONS.map((r) => (
            <label
              key={r}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-line px-3 has-[:checked]:border-primary has-[:checked]:bg-primary-soft"
            >
              <input
                type="radio"
                name={`reason-${hazardId}`}
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
                className="size-5 accent-primary"
              />
              {tr(`dismissReasons.${r}`)}
            </label>
          ))}
        </fieldset>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`dismiss-${hazardId}`}>
            {reason === "other" ? t("dismissNoteRequired") : t("dismissNoteOptional")}
          </Label>
          <Textarea
            id={`dismiss-${hazardId}`}
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            rows={2}
          />
          <p className="text-sm text-ink-2">{t("dismissWorkerSees")}</p>
        </div>
        {errorText}
        <Button
          size="lg"
          variant="danger"
          disabled={pending || !reason || (reason === "other" && note.trim().length < 3)}
          onClick={() => run(() => hazardStatusAction({ type: "dismiss", hazardId, reason, note: note || undefined }))}
        >
          {t("confirmDismiss")}
        </Button>
      </Sheet>

      <Sheet open={dialog === "merge"} onClose={() => setDialog(null)} title={t("mergeTitle")}>
        <p className="text-ink-2">{t("mergeHint")}</p>
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">{t("mergeTitle")}</legend>
          {mergeTargets.map((m) => (
            <label
              key={m.id}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-line px-3 has-[:checked]:border-primary has-[:checked]:bg-primary-soft"
            >
              <input
                type="radio"
                name={`merge-${hazardId}`}
                value={m.id}
                checked={target === m.id}
                onChange={() => setTarget(m.id)}
                className="size-5 accent-primary"
              />
              {m.label}
            </label>
          ))}
        </fieldset>
        {errorText}
        <Button
          size="lg"
          disabled={pending || !target}
          onClick={() => run(() => mergeHazardAction({ sourceId: hazardId, targetId: target }))}
        >
          {t("confirmMerge")}
        </Button>
      </Sheet>
    </div>
  );
}
