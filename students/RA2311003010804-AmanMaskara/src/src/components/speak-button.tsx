"use client";

import { useState } from "react";
import { Loader2, Volume2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { speak } from "@/lib/speak";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** Reads `text` aloud in `lang` (default: the app language), and says so when this device cannot. */
export function SpeakButton({
  text,
  lang,
  className,
  label,
}: {
  text: string;
  lang?: string;
  className?: string;
  label?: string;
}) {
  const t = useTranslations("a11y");
  const appLocale = useLocale();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    const played = await speak(text, lang ?? appLocale);
    setLoading(false);
    if (!played) toast(t("audioUnavailable"));
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("bg-surface-2/70 text-primary hover:bg-primary-soft", className)}
      aria-label={label ?? t("speakButton")}
      aria-busy={loading || undefined}
      onClick={onClick}
    >
      {loading ? (
        <Loader2 aria-hidden="true" className="size-5 animate-spin" />
      ) : (
        <Volume2 aria-hidden="true" className="size-6" />
      )}
    </Button>
  );
}
