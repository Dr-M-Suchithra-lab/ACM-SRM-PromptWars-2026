import { SPEECH_LANG } from "./speak";

/** Minimal typing for the Web Speech API (not in TypeScript's DOM lib). */
export interface Recognizer {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult:
    | ((event: {
        resultIndex: number;
        results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type RecognizerCtor = new () => Recognizer;

function recognizerCtor(): RecognizerCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognizerCtor; webkitSpeechRecognition?: RecognizerCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function canRecognizeSpeech(): boolean {
  return recognizerCtor() !== null;
}

/** BCP-47 tag the recogniser should listen for, e.g. "ta" → "ta-IN". Unknown locales fall back to Indian English. */
export function recognitionLang(locale: string): string {
  return SPEECH_LANG[locale] ?? "en-IN";
}

/** A recogniser tuned for one short spoken report in the worker's language, or null if unsupported. */
export function createRecognizer(locale: string): Recognizer | null {
  const Ctor = recognizerCtor();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = recognitionLang(locale);
  rec.interimResults = true; // show words as they are heard
  rec.continuous = false; // one report, ends on a pause
  rec.maxAlternatives = 1;
  return rec;
}

/** Join final and interim result chunks into the text heard so far. */
export function transcriptFrom(results: ArrayLike<ArrayLike<{ transcript: string }>>): string {
  return Array.from(results, (r) => r[0]?.transcript ?? "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
