import { afterEach, describe, it, expect, vi } from "vitest";
import { explain } from "../server/ai";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
describe("Saarthi explanations", () => {
  it.each(["en", "ta", "hi"] as const)(
    "provides a text fallback in %s",
    async (language) => {
      vi.stubEnv("GEMINI_API_KEY", "");
      const r = await explain("pay", language);
      expect(r.source).toBe("fallback");
      expect(r.explanation.length).toBeGreaterThan(50);
      vi.unstubAllEnvs();
    },
  );
  it("falls back when Gemini fails", async () =>
    expect(
      (
        await explain("safety", "en", {}, async () => {
          throw new Error("Unavailable");
        })
      ).source,
    ).toBe("fallback"));
  it("falls back for invalid structured output", async () =>
    expect(
      (await explain("rest", "ta", {}, async () => '{"invented":"unsafe"}'))
        .source,
    ).toBe("fallback"));
  it("validates structured output", async () =>
    expect(
      (
        await explain("cases", "hi", {}, async () =>
          JSON.stringify({
            explanation: "A valid explanation.",
            nextAction: "Open cases.",
          }),
        )
      ).source,
    ).toBe("gemini"));
  it("releases its deadline after a successful response", async () => {
    vi.useFakeTimers();
    const response = await explain("pay", "en", {}, async () =>
      JSON.stringify({
        explanation: "Configured policy explanation.",
        nextAction: "Open pay.",
      }),
    );
    expect(response.source).toBe("gemini");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("releases its deadline after provider failure", async () => {
    vi.useFakeTimers();
    const response = await explain("safety", "hi", {}, async () => {
      throw new Error("Provider unavailable");
    });
    expect(response.source).toBe("fallback");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("returns translated fallback at the deadline if the provider never settles", async () => {
    vi.useFakeTimers();
    const pending = explain(
      "rest",
      "ta",
      {},
      () => new Promise<string>(() => {}),
    );
    await vi.advanceTimersByTimeAsync(8499);
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toMatchObject({
      source: "fallback",
      explanation: expect.stringContaining("ஓய்வை"),
    });
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each([
    "not JSON",
    '{"explanation":"OK","nextAction":"Continue","extra":true}',
  ])("falls back for malformed or unexpected output: %s", async (output) => {
    vi.useFakeTimers();
    expect((await explain("pay", "en", {}, async () => output)).source).toBe(
      "fallback",
    );
    expect(vi.getTimerCount()).toBe(0);
  });
});
