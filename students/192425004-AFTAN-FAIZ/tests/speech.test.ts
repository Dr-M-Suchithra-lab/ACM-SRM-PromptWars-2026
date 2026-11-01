import { describe, expect, it } from "vitest";
import { selectSpeechVoice, speechLocale } from "../src/lib/speech";

describe("language-safe device voice selection", () => {
  it("prefers a local exact locale over a remote or different region voice", () => {
    const voices = [
      { lang: "en-US", localService: true },
      { lang: "en-IN", localService: false },
      { lang: "en-IN", localService: true },
    ];
    expect(selectSpeechVoice(voices, "en")).toBe(voices[2]);
  });
  it.each(["en", "ta", "hi"] as const)(
    "selects %s only from that language",
    (language) => {
      const voices = [
        { lang: "fr-FR", localService: true },
        { lang: speechLocale[language], localService: false },
      ];
      expect(selectSpeechVoice(voices, language)).toBe(voices[1]);
      expect(selectSpeechVoice([voices[0]], language)).toBeUndefined();
    },
  );
  it("handles normalized locale variants and delayed empty voice lists", () => {
    const voice = { lang: "TA_in", localService: true };
    expect(selectSpeechVoice([voice], "ta")).toBe(voice);
    expect(selectSpeechVoice([], "hi")).toBeUndefined();
  });
  it("permits another region of the requested language, never another language", () => {
    const voice = { lang: "en-GB", localService: true };
    expect(selectSpeechVoice([voice], "en")).toBe(voice);
    expect(selectSpeechVoice([voice], "hi")).toBeUndefined();
  });
});
