"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Camera, CloudUpload, LogOut, QrCode, ScanLine } from "lucide-react";
import { checkInAction, checkOutAction, demoSiteTokenAction, type ActionResult } from "@/server/actions/attendance";
import { enqueue, isNetworkError } from "@/lib/offline-queue";
import { useNavigation } from "@/components/providers/navigation-provider";
import { Button } from "@/components/ui/button";
import { SpeakButton } from "@/components/speak-button";
import { SuccessCheck } from "@/components/success-check";
import { PageHeader } from "@/components/page-header";
import { QrScanner } from "./qr-scanner";

/** Every step is local state: none of them adds a browser history entry. */
type Phase = "idle" | "explain" | "scanning" | "done" | "queued";

/**
 * Check-in / check-out flow. It owns its heading: the mode is fixed when the screen opens, so
 * the refresh after a successful check-in can never flip the title to "Check out" while the
 * body still says "Checked in!".
 */
export function CheckinPanel({ checkedIn, demo }: { checkedIn: boolean; demo: boolean }) {
  const t = useTranslations("checkin");
  const router = useRouter();
  const { goBack } = useNavigation();
  const [mode] = useState<"checkin" | "checkout">(checkedIn ? "checkout" : "checkin");
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const finish = useCallback(
    (result: ActionResult, successKey: "success" | "checkoutSuccess") => {
      if (result.ok) {
        navigator.vibrate?.(200);
        setMessage(t(successKey));
        setPhase("done");
        router.refresh(); // home counters update in the background
      } else {
        setError(t(`errors.${result.error}`));
        setPhase("idle");
      }
    },
    [router, t],
  );

  const submitCheckIn = useCallback(
    (token: string) => {
      const op = { clientOpId: crypto.randomUUID(), createdAt: new Date().toISOString() };
      setError("");
      startTransition(async () => {
        try {
          finish(await checkInAction({ token, clientOpId: op.clientOpId, scannedAt: op.createdAt }), "success");
        } catch (e) {
          if (!isNetworkError(e)) throw e;
          await enqueue({ type: "checkin", ...op, payload: { token } });
          setMessage(t("savedOffline"));
          setPhase("queued");
        }
      });
    },
    [finish, t],
  );

  function submitCheckOut() {
    const op = { clientOpId: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setError("");
    startTransition(async () => {
      try {
        finish(await checkOutAction({ clientOpId: op.clientOpId, at: op.createdAt }), "checkoutSuccess");
      } catch (e) {
        if (!isNetworkError(e)) throw e;
        await enqueue({ type: "checkout", ...op });
        setMessage(t("savedOffline"));
        setPhase("queued");
      }
    });
  }

  function simulateScan() {
    startTransition(async () => {
      const token = await demoSiteTokenAction();
      if (token) submitCheckIn(token);
    });
  }

  const onCameraError = useCallback(() => {
    setError(t("errors.camera"));
    setPhase("idle");
  }, [t]);

  const finished = phase === "done" || phase === "queued";
  const title = finished ? message : mode === "checkout" ? t("checkoutTitle") : t("title");
  const hint = finished
    ? t(mode === "checkout" ? "checkoutDoneHint" : "checkinDoneHint")
    : mode === "checkout"
      ? t("checkoutHint")
      : t("hint");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} action={<SpeakButton text={`${title}. ${hint}`} />}>
        {hint}
      </PageHeader>

      {error && (
        <p role="alert" className="rounded-2xl bg-danger-soft p-4 font-semibold text-danger">
          {error}
        </p>
      )}

      {finished ? (
        <div
          role="status"
          aria-live="polite"
          className="card rise-in flex flex-col items-center gap-4 px-5 py-10 text-center"
        >
          {phase === "done" ? <SuccessCheck /> : <CloudUpload aria-hidden="true" className="size-20 text-primary" />}
          <p className="font-display text-3xl font-extrabold">{message}</p>
          <Button size="lg" variant="outline" onClick={goBack}>
            {t("backHome")}
          </Button>
        </div>
      ) : mode === "checkout" ? (
        <div className="hero-card flex flex-col gap-4 p-5 md:p-7">
          <Button
            size="lg"
            className="min-h-20 text-xl"
            onClick={submitCheckOut}
            disabled={pending}
            aria-busy={pending || undefined}
          >
            <LogOut aria-hidden="true" className="size-8" />
            {t("checkoutButton")}
          </Button>
        </div>
      ) : phase === "scanning" ? (
        <>
          <QrScanner onResult={submitCheckIn} onError={onCameraError} label={t("scanQR")} />
          <Button variant="outline" size="lg" onClick={() => setPhase("idle")}>
            {t("cancel")}
          </Button>
        </>
      ) : phase === "explain" ? (
        <div className="card rise-in flex flex-col items-center gap-4 p-6 text-center">
          <span className="flex size-20 items-center justify-center rounded-3xl bg-primary-soft text-primary-strong">
            <Camera aria-hidden="true" className="size-10" />
          </span>
          <p className="text-lg">{t("cameraWhy")}</p>
          <SpeakButton text={t("cameraWhy")} />
          <Button size="lg" className="w-full" onClick={() => setPhase("scanning")}>
            {t("allowCamera")}
          </Button>
        </div>
      ) : (
        <div className="hero-card flex flex-col items-center gap-6 p-6 md:p-8">
          <div className="viewfinder flex size-44 items-center justify-center" aria-hidden="true">
            <QrCode className="size-24 text-primary/70" strokeWidth={1.4} />
          </div>
          <Button size="lg" className="min-h-20 w-full text-xl" onClick={() => setPhase("explain")} disabled={pending}>
            <ScanLine aria-hidden="true" className="size-8" />
            {t("scanQR")}
          </Button>
        </div>
      )}

      {demo && mode === "checkin" && !finished && phase !== "scanning" && (
        <Button variant="secondary" onClick={simulateScan} disabled={pending} aria-busy={pending || undefined}>
          {t("simulateScan")}
        </Button>
      )}
    </div>
  );
}
