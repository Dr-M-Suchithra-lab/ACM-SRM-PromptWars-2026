"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, RefreshCw } from "lucide-react";
import { passportLinkAction, type PassportLink } from "@/server/actions/passport";
import type { PassportShare as Share } from "@/core/work-history";
import { formatDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const SECTIONS = ["skills", "history", "hours"] as const;

/** The worker chooses what a new employer sees, then shows a signed QR that expires in 30 days. */
export function PassportShare() {
  const t = useTranslations("passport.share");
  const locale = useLocale();
  const [share, setShare] = useState<Share>({ skills: true, history: true, hours: true });
  const [link, setLink] = useState<PassportLink | null>(null);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  function generate() {
    setError(false);
    startTransition(async () => {
      const next = await passportLinkAction(share);
      if (next) setLink(next);
      else setError(true);
    });
  }

  function toggle(section: (typeof SECTIONS)[number]) {
    setShare((s) => ({ ...s, [section]: !s[section] }));
    setLink(null); // a changed choice needs a new QR
  }

  const nothing = !share.skills && !share.history && !share.hours;

  return (
    <section aria-labelledby="share-title" className="hero-card flex flex-col gap-4 p-5 md:p-6">
      <div>
        <h2 id="share-title" className="font-display text-2xl font-extrabold">
          {t("title")}
        </h2>
        <p className="text-ink-2">{t("hint")}</p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-bold">{t("choose")}</legend>
        {SECTIONS.map((section) => (
          <label
            key={section}
            className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-2xl bg-white/80 px-4"
          >
            <span className="font-semibold">{t(`sections.${section}`)}</span>
            <input
              type="checkbox"
              role="switch"
              checked={share[section]}
              onChange={() => toggle(section)}
              className="size-6 accent-primary"
            />
          </label>
        ))}
      </fieldset>

      {link ? (
        <div className="flex flex-col items-center gap-3 text-center" aria-live="polite">
          <div className="rounded-3xl bg-white p-4 shadow-[var(--shadow-card)] ring-8 ring-accent/30">
            <QRCodeSVG value={link.url} size={196} title={t("qrLabel")} />
          </div>
          <p className="figure text-sm font-semibold">
            {t("validity", {
              issued: formatDay(link.issuedAt.slice(0, 10), locale),
              until: formatDay(link.expiresAt.slice(0, 10), locale),
            })}
          </p>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-bold text-primary underline underline-offset-4"
          >
            {t("openLink")}
          </a>
          <Button variant="outline" onClick={generate} disabled={pending || nothing}>
            <RefreshCw aria-hidden="true" className={cn("size-4", pending && "animate-spin")} />
            {t("regenerate")}
          </Button>
        </div>
      ) : (
        <Button size="lg" onClick={generate} disabled={pending || nothing} aria-busy={pending || undefined}>
          <QrCode aria-hidden="true" className="size-5" />
          {t("show")}
        </Button>
      )}
      {nothing && <p className="text-sm text-ink-2">{t("pickOne")}</p>}
      {error && (
        <p role="alert" className="font-semibold text-danger">
          {t("error")}
        </p>
      )}
    </section>
  );
}
