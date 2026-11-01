import { afterEach, describe, expect, it, vi } from "vitest";
import { deviceVoiceFor, speak, stopSpeaking } from "@/lib/speak";
import { canRecognizeSpeech, createRecognizer, recognitionLang, transcriptFrom } from "@/lib/speech-recognition";

afterEach(() => {
  stopSpeaking();
  vi.unstubAllGlobals();
});

/** A fake device speech engine with the given voices (lang tags as browsers report them). */
function deviceWithVoices(...langs: string[]) {
  let voices = langs.map((lang) => ({ lang, name: lang }));
  const synth = {
    getVoices: () => voices,
    speak: vi.fn(),
    cancel: vi.fn(),
    addEventListener: vi.fn(),
    /** Chrome on Android loads voices after the first call. */
    loadLater(...later: string[]) {
      voices = [];
      synth.addEventListener.mockImplementation((_: string, done: () => void) => {
        voices = later.map((lang) => ({ lang, name: lang }));
        done();
      });
    },
  };
  vi.stubGlobal("window", { speechSynthesis: synth });
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      lang = "";
      voice: unknown = null;
      rate = 1;
      constructor(public text: string) {}
    },
  );
  return synth;
}

/** A fake server speech endpoint and audio element. */
function serverSpeech(status: number) {
  const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
    async () => new Response("audio", { status }),
  );
  const play = vi.fn(async () => {});
  vi.stubGlobal("fetch", fetch);
  vi.stubGlobal("URL", Object.assign(class {}, { createObjectURL: () => "blob:x", revokeObjectURL: vi.fn() }));
  vi.stubGlobal(
    "Audio",
    class {
      play = play;
      pause = vi.fn();
      addEventListener = vi.fn();
    },
  );
  return { fetch, play };
}

describe("reading aloud", () => {
  it("uses the device voice for the worker's language, slightly slower", async () => {
    const synth = deviceWithVoices("en-US", "ta_IN");
    expect(await speak("வணக்கம்", "ta")).toBe(true);
    const utterance = synth.speak.mock.calls[0][0];
    expect(utterance).toMatchObject({ text: "வணக்கம்", lang: "ta-IN", rate: 0.9, voice: { lang: "ta_IN" } });
  });

  it("waits for voices that load late", async () => {
    deviceWithVoices().loadLater("hi-IN");
    expect(await deviceVoiceFor("hi")).toMatchObject({ lang: "hi-IN" });
  });

  it("falls back to server speech (capped at 400 characters) when the phone has no voice", async () => {
    deviceWithVoices("en-IN");
    const { fetch, play } = serverSpeech(200);
    expect(await speak("న".repeat(500), "te")).toBe(true);
    expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toEqual({ text: "న".repeat(400), locale: "te" });
    expect(play).toHaveBeenCalled();
  });

  it("reports failure instead of staying silent", async () => {
    deviceWithVoices();
    serverSpeech(503);
    expect(await speak("hello", "te")).toBe(false);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("offline");
      }),
    );
    expect(await speak("hello", "te")).toBe(false);
  });

  it("does nothing outside a browser", async () => {
    expect(await deviceVoiceFor("en")).toBeNull();
    expect(await speak("hello", "en")).toBe(false);
  });
});

describe("speech recognition", () => {
  it("is unavailable outside a browser or without the Web Speech API", () => {
    expect(canRecognizeSpeech()).toBe(false);
    expect(createRecognizer("hi")).toBeNull();
    vi.stubGlobal("window", {});
    expect(canRecognizeSpeech()).toBe(false);
  });

  it("listens once, in the worker's language, showing words as they come", () => {
    vi.stubGlobal("window", { webkitSpeechRecognition: class {} });
    expect(canRecognizeSpeech()).toBe(true);
    expect(createRecognizer("hi")).toMatchObject({
      lang: "hi-IN",
      interimResults: true,
      continuous: false,
      maxAlternatives: 1,
    });
    expect(recognitionLang("fr")).toBe("en-IN");
  });

  it("joins result chunks into one clean sentence", () => {
    expect(transcriptFrom([[{ transcript: " wire is " }], [{ transcript: "  hanging" }], []])).toBe("wire is hanging");
  });
});
