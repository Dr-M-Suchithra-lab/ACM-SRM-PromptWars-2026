import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// A deterministic device API adapter tests controls, not audible device output.
async function deviceSpeech(
  page: Page,
  options = { supported: true, empty: false, throws: false },
) {
  await page.addInitScript(({ supported, empty, throws }) => {
    if (!supported) {
      Object.defineProperty(window, "speechSynthesis", {
        configurable: true,
        value: undefined,
      });
      return;
    }
    class Utterance extends EventTarget {
      lang = "";
      voice: SpeechSynthesisVoice | null = null;
      onstart: ((event: SpeechSynthesisEvent) => void) | null = null;
      onend: ((event: SpeechSynthesisEvent) => void) | null = null;
      onerror: ((event: SpeechSynthesisErrorEvent) => void) | null = null;
      constructor(public text: string) {
        super();
      }
    }
    let current: Utterance | null = null;
    const voices = ["en-IN", "ta-IN", "hi-IN"].map((lang) => ({
      lang,
      localService: true,
      default: false,
      name: "Synthetic " + lang,
      voiceURI: lang,
    }));
    const state = {
      calls: [] as { text: string; lang: string; voice: string | undefined }[],
      cancels: 0,
      voices: empty ? [] : voices,
    };
    const synth = Object.assign(new EventTarget(), {
      getVoices: () => state.voices,
      speak: (utterance: Utterance) => {
        if (throws) throw new Error("Synthetic device speech failure");
        current = utterance;
        state.calls.push({
          text: utterance.text,
          lang: utterance.lang,
          voice: utterance.voice?.lang,
        });
        utterance.onstart?.(new Event("start") as SpeechSynthesisEvent);
      },
      cancel: () => {
        state.cancels++;
        current?.onerror?.({ error: "canceled" } as SpeechSynthesisErrorEvent);
        current = null;
      },
    });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: synth,
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: Utterance,
    });
    Object.defineProperty(window, "__speechQA", {
      value: {
        state,
        load: () => {
          state.voices = voices;
          synth.dispatchEvent(new Event("voiceschanged"));
        },
        fail: () =>
          current?.onerror?.({
            error: "synthesis-failed",
          } as SpeechSynthesisErrorEvent),
        end: () => current?.onend?.(new Event("end") as SpeechSynthesisEvent),
      },
    });
  }, options);
}
type VoiceQA = {
  state: {
    cancels: number;
    calls: { text: string; lang: string; voice?: string }[];
  };
  load: () => void;
  fail: () => void;
  end: () => void;
};
declare global {
  interface Window {
    __speechQA: VoiceQA;
  }
}
const snapshot = (page: Page) => page.evaluate(() => window.__speechQA.state);
async function openAssistant(page: Page, language = "en") {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore worker demo", exact: true })
    .click();
  await expect(page.locator(".workspace-tag")).toContainText("Buildwell");
  await page.locator(".topbar select").selectOption(language);
  await page.locator(".assistant-fab").click();
  await expect(page.locator(".assistant-response")).toBeVisible();
}

for (const [language, read, stop] of [
  ["en", "Read aloud", "Stop speech"],
  ["ta", "சத்தமாக வாசி", "வாசிப்பை நிறுத்து"],
  ["hi", "पढ़कर सुनाएँ", "पढ़ना रोकें"],
])
  test(`device speech controls select ${language}, stop, restart and cancel on close`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await deviceSpeech(page);
    await openAssistant(page, language);
    await page.getByRole("button", { name: read, exact: true }).click();
    await expect(
      page.getByRole("button", { name: stop, exact: true }),
    ).toBeVisible();
    const first = await snapshot(page);
    expect(first.calls[0].lang).toBe(language + "-IN");
    expect(first.calls[0].voice).toBe(language + "-IN");
    expect(first.calls[0].text.length).toBeGreaterThan(20);
    await page.getByRole("button", { name: stop, exact: true }).click();
    expect((await snapshot(page)).cancels).toBe(first.cancels + 1);
    await page.getByRole("button", { name: read, exact: true }).click();
    const playing = await snapshot(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    expect((await snapshot(page)).cancels).toBe(playing.cancels + 1);
    expect(errors).toEqual([]);
  });

test("unsupported device speech leaves guidance readable and explains availability", async ({
  page,
}) => {
  await deviceSpeech(page, { supported: false, empty: false, throws: false });
  await openAssistant(page);
  await expect(page.locator(".speech-controls")).toContainText(
    "Speech is unavailable",
  );
  await expect(page.locator(".speech-controls button")).toHaveCount(0);
  await expect(page.locator(".assistant-response p").first()).not.toBeEmpty();
});

test("delayed device voices, playback error, completion and topic changes recover safely", async ({
  page,
}) => {
  await deviceSpeech(page, { supported: true, empty: true, throws: false });
  await openAssistant(page);
  const control = page.locator(".speech-controls");
  await page.getByRole("button", { name: "Read aloud", exact: true }).click();
  await expect(control).toContainText("No English voice");
  expect((await snapshot(page)).calls).toHaveLength(0);
  await page.evaluate(() => window.__speechQA.load());
  // Retrying uses the asynchronously loaded voice without reloading the page.
  await page.getByRole("button", { name: "Read aloud", exact: true }).click();
  await page.evaluate(() => window.__speechQA.fail());
  await expect(control).toContainText("Speech could not play");
  await page.getByRole("button", { name: "Read aloud", exact: true }).click();
  await page.evaluate(() => window.__speechQA.end());
  await expect(control).toContainText("Reading finished");
  await page.getByRole("button", { name: "Read aloud", exact: true }).click();
  const playing = await snapshot(page);
  await page
    .locator(".assistant-topics")
    .getByRole("button", { name: "RestGuard", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Read aloud", exact: true }),
  ).toBeVisible();
  expect((await snapshot(page)).cancels).toBeGreaterThan(playing.cancels);
});

test("device speech exceptions are visible without an unhandled JavaScript error", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await deviceSpeech(page, { supported: true, empty: false, throws: true });
  await openAssistant(page);
  await page.getByRole("button", { name: "Read aloud", exact: true }).click();
  await expect(page.locator(".speech-controls")).toContainText(
    "Speech could not play",
  );
  await expect(
    page.getByRole("button", { name: "Read aloud", exact: true }),
  ).toBeVisible();
  const accessibility = await new AxeBuilder({ page })
    .include(".modal")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({
    path: ".local/audit-voice-error-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator(".speech-controls")).toBeVisible();
  await page.screenshot({
    path: ".local/audit-voice-error-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
