import { describe, expect, it } from "vitest";
import { questionIntent } from "../server/assistant";
import { assistantInput } from "../shared/contracts";

describe("workplace questions stay within supported, privacy-preserving intents", () => {
  it.each([
    ["Why is my salary lower than expected?", "pay", "overview"],
    ["How much overtime did I work?", "pay", "overtime"],
    ["Why is my rest period flagged?", "rest", "overview"],
    ["What happened to my payroll dispute?", "cases", "overview"],
    ["How do I report an unsafe workplace?", "safety", "overview"],
    ["Explain my last five shifts.", "pay", "recent_shifts"],
    ["என் சம்பளத்தை விளக்குங்கள்", "pay", "overview"],
    ["मेरे ओवरटाइम घंटे बताओ", "pay", "overtime"],
    ["Write a poem", "pay", "unsupported"],
  ] as const)("classifies %s", (question, topic, intent) => {
    expect(questionIntent("pay", question)).toEqual({ topic, intent });
  });
  it("bounds follow-ups and rejects client-supplied context/history/roles", () => {
    const input = { topic: "pay", language: "en", question: "Explain my pay" };
    expect(assistantInput.safeParse(input).success).toBe(true);
    for (const patch of [
      { question: "x".repeat(601) },
      { context: { expectedPaise: 1 } },
      { history: [] },
      { role: "admin" },
    ])
      expect(assistantInput.safeParse({ ...input, ...patch }).success).toBe(
        false,
      );
  });
});
