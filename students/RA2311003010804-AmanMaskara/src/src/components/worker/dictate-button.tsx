"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Mic, Square } from "lucide-react";
import { canRecognizeSpeech, createRecognizer, transcriptFrom, type Recognizer } from "@/lib/speech-recognition";
import { cn } from "@/lib/utils";

const noSubscription = () => () => {};

/**
 * Speak instead of typing: the phone's own speech recognition, in the worker's language.
 * Words are handed to `onText` when listening ends. Hidden where the browser can't listen.
 */
export function DictateButton({ onText, className }: { onText: (text: string) => void; className?: string }) {
  const t = useTranslations("a11y");
  const locale = useLocale();
  // Capability never changes after load: no subscription needed; the server renders "unsupported".
  const supported = useSyncExternalStore(noSubscription, canRecognizeSpeech, () => false);
  const [listening, setListening] = useState(false);
  const recognizer = useRef<Recognizer | null>(null);

  useEffect(() => () => recognizer.current?.abort(), []);

  function toggle() {
    if (listening) {
      recognizer.current?.stop();
      return;
    }
    const rec = createRecognizer(locale);
    if (!rec) return;
    let text = "";
    rec.onresult = (event) => {
      text = transcriptFrom(event.results);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => {
      setListening(false);
      recognizer.current = null;
      if (text) onText(text);
    };
    recognizer.current = rec;
    rec.start();
    setListening(true);
  }

  if (!supported) return null;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={listening}
      aria-label={listening ? t("stopDictation") : t("dictate")}
      className={cn(
        "press relative z-0 flex size-12 shrink-0 items-center justify-center rounded-full",
        listening
          ? "mic-pulse bg-danger text-white"
          : "bg-primary-soft text-primary-strong hover:bg-primary hover:text-on-primary",
        className,
      )}
    >
      {listening ? <Square aria-hidden="true" className="size-5" /> : <Mic aria-hidden="true" className="size-5" />}
    </button>
  );
}
