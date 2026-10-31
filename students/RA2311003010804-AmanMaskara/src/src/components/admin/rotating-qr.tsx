"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { kioskTokenAction } from "@/server/actions/attendance";

const ROTATE_SECONDS = 30;

/** Kiosk QR that refreshes every 30 s, so a photo of it stops working almost immediately. */
export function RotatingQr({ siteId, initialToken }: { siteId: string; initialToken: string }) {
  const t = useTranslations("kiosk");
  const [token, setToken] = useState(initialToken);
  const [secondsLeft, setSecondsLeft] = useState(ROTATE_SECONDS);

  useEffect(() => {
    const tick = setInterval(() => {
      setSecondsLeft((s) => {
        if (s > 1) return s - 1;
        kioskTokenAction(siteId).then((next) => next && setToken(next));
        return ROTATE_SECONDS;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [siteId]);

  const progress = secondsLeft / ROTATE_SECONDS;
  return (
    <figure className="flex flex-col items-center gap-3">
      <div className="viewfinder rounded-[28px] p-3" data-testid="kiosk-qr">
        <div className="rounded-3xl bg-white p-4">
          <QRCodeSVG value={token} size={300} level="M" title={t("qrLabel")} className="h-auto max-w-full" />
        </div>
      </div>
      <figcaption className="figure flex items-center gap-2 font-bold" aria-live="off">
        <svg viewBox="0 0 36 36" className="size-8 -rotate-90" aria-hidden="true">
          <circle cx="18" cy="18" r="15" fill="none" stroke="var(--line)" strokeWidth="4" />
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="4"
            strokeDasharray={`${progress * 94.2} 94.2`}
            style={{ transition: "stroke-dasharray 1s linear" }}
          />
        </svg>
        {t("refreshIn", { seconds: secondsLeft })}
      </figcaption>
    </figure>
  );
}
