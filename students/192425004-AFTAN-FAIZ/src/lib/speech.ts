import type { Language } from "../i18n";

export const speechLocale: Record<Language, string> = {
  en: "en-IN",
  ta: "ta-IN",
  hi: "hi-IN",
};

// Never substitute another language just because it is the system default.
export function selectSpeechVoice<
  T extends { lang: string; localService: boolean },
>(voices: readonly T[], language: Language): T | undefined {
  const locale = speechLocale[language].toLowerCase();
  const matching = voices.filter(
    (v) => v.lang.toLowerCase().replaceAll("_", "-").split("-")[0] === language,
  );
  return (
    matching.find(
      (v) =>
        v.lang.toLowerCase().replaceAll("_", "-") === locale && v.localService,
    ) ??
    matching.find(
      (v) => v.lang.toLowerCase().replaceAll("_", "-") === locale,
    ) ??
    matching.find((v) => v.localService) ??
    matching[0]
  );
}
