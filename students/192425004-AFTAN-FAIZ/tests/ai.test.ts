import { afterEach, describe, it, expect, vi } from "vitest";
import { aiConfigured, explain } from "../server/ai";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe("Saarthi explanations", () => {
  it("recognizes the existing server-only production key alias without exposing its value", () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("saathi_api", "synthetic-private-key");
    vi.stubEnv("GEMINI_MODEL", "gemini-3.8-flash");
    expect(aiConfigured()).toBe(true);
    expect(JSON.stringify({ aiConfigured: aiConfigured() })).not.toContain(
      "synthetic-private-key",
    );
    vi.stubEnv("GEMINI_MODEL", "");
    expect(aiConfigured()).toBe(false);
  });
  it("rejects provider-invented numeric pay and retains deterministic record facts", async () => {
    const response = await explain(
      "pay",
      "en",
      {
        intent: "overview",
        shifts: [
          {
            date: "2026-10-26T08:00:00+05:30",
            confirmed: true,
            payableMinutes: 600,
            overtimeMinutes: 120,
            expectedPaise: 110000,
            recordedPaise: 95000,
            discrepancyPaise: 15000,
          },
        ],
      },
      async () =>
        JSON.stringify({
          explanation: "You are owed ₹999999.",
          nextAction: "Pay it.",
        }),
    );
    expect(response.source).toBe("fallback");
    expect(response.explanation).toContain("₹150");
    expect(response.explanation).not.toContain("999999");
  });
  it("projects facts and never forwards raw questions, identifiers or tracking secrets", async () => {
    const generator = vi.fn(async (_prompt: string) =>
      JSON.stringify({
        explanation: "Review the recorded amounts.",
        nextAction: "Open pay.",
      }),
    );
    await explain(
      "pay",
      "en",
      {
        intent: "overview",
        user_id: "private-user",
        question: "private-question",
        token: "private-tracking-token",
        description: "private report",
      },
      generator,
    );
    const prompt = generator.mock.calls[0]?.[0];
    // The injection function is typed by explain's provider boundary.
    expect(String(prompt)).not.toMatch(
      /private-user|private-question|private-tracking-token|private report/,
    );
  });
  it("includes verified numbers in fallback instead of pretending missing payroll is zero", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const response = await explain("pay", "en", {
      intent: "overtime",
      timezone: "Asia/Kolkata",
      shifts: [
        {
          date: "2026-10-26T08:00:00+05:30",
          confirmed: true,
          payableMinutes: 600,
          overtimeMinutes: 120,
          expectedPaise: 110000,
          recordedPaise: null,
          discrepancyPaise: null,
        },
      ],
    });
    expect(response.explanation).toContain("₹1,100");
    expect(response.explanation).toContain("Overtime hours 2");
    expect(response.explanation).toContain("No payroll entry recorded");
    expect(response.explanation).not.toContain("Potential difference");
  });
  it("logs only sanitized provider failure categories", async () => {
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    await explain("pay", "en", {}, async () => {
      throw Object.assign(new Error("secret provider response"), {
        status: 429,
      });
    });
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('"reason":"quota_or_rate_limit"'),
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain(
      "secret provider response",
    );
  });
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
