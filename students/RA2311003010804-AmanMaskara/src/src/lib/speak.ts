/** BCP-47 tags used to pick a device voice for each app locale. */
export const SPEECH_LANG: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  ta: "ta-IN",
  te: "te-IN",
};

const VOICES_TIMEOUT_MS = 600;

/** Device voices load asynchronously on Chrome/Android: wait briefly for the list. */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  const synth = window.speechSynthesis;
  const now = synth.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => resolve(synth.getVoices());
    synth.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, VOICES_TIMEOUT_MS);
  });
}

/** A device voice for the locale's language, if the phone or browser has one. */
export async function deviceVoiceFor(locale: string): Promise<SpeechSynthesisVoice | null> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const language = (SPEECH_LANG[locale] ?? locale).slice(0, 2);
  return (await loadVoices()).find((v) => v.lang.replace("_", "-").toLowerCase().startsWith(language)) ?? null;
}

let currentAudio: HTMLAudioElement | null = null;

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  currentAudio?.pause();
  currentAudio = null;
}

/** Server fallback (Gemini TTS, cached): used when the device has no voice for the language. */
async function speakViaServer(text: string, locale: string): Promise<boolean> {
  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, locale }),
    });
    if (response.status !== 200) return false;
    const url = URL.createObjectURL(await response.blob());
    currentAudio = new Audio(url);
    currentAudio.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });
    await currentAudio.play();
    return true;
  } catch {
    return false;
  }
}

/**
 * Read text aloud in the worker's language: the device voice first (instant, offline),
 * then server speech. Resolves false when no audio could be played, so the caller can say so
 * instead of failing silently.
 */
export async function speak(text: string, locale: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  stopSpeaking();
  const voice = await deviceVoiceFor(locale);
  if (voice) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = SPEECH_LANG[locale] ?? locale;
    utterance.voice = voice;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
    return true;
  }
  return speakViaServer(text.slice(0, 400), locale);
}
