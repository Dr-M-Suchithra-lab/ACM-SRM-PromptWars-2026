import "server-only";
import { getAiClient, MODELS, type AiClient } from "./client";
import { PayExplanation, payJsonSchema } from "./schemas";
import { paySystemPrompt, untrusted } from "./prompts";
import { describeAiError, logAiCall } from "./log";

export interface PayFacts {
  /** Pre-formatted values exactly as the worker sees them, e.g. "42", "₹4,200.00" */
  values: Record<string, string>;
}

/** Every number shown to the worker must survive the rewrite unchanged. */
export function keepsAllNumbers(sentences: string[], facts: PayFacts): boolean {
  const text = sentences.join(" ");
  return Object.values(facts.values).every((v) => text.includes(v));
}

/**
 * Optional friendlier wording for an already-computed payslip.
 * Returns null when Gemini is unavailable or changed/dropped a number,
 * in which case the caller keeps the deterministic template text.
 */
export async function explainPay(
  facts: PayFacts,
  templateSentences: string[],
  locale: string,
  client: AiClient | null = getAiClient(),
): Promise<string[] | null> {
  if (!client) return null;
  const payload = untrusted(
    `${templateSentences.join(" ")}\nNumbers to keep exactly: ${Object.values(facts.values).join(" | ")}`,
  );
  for (const [index, model] of [MODELS.fast, MODELS.fallback].entries()) {
    const started = Date.now();
    try {
      const raw = await client.generateText({
        model,
        system: paySystemPrompt(locale),
        parts: [{ text: payload }],
        jsonSchema: payJsonSchema,
      });
      const parsed = PayExplanation.safeParse(JSON.parse(raw));
      const accepted = parsed.success && keepsAllNumbers(parsed.data.sentences, facts);
      await logAiCall({
        feature: "explainPay",
        model,
        latencyMs: Date.now() - started,
        fallbackUsed: index > 0,
        // A rewrite that changes or drops a number is never shown: the worker keeps the exact template.
        error: accepted
          ? undefined
          : parsed.success
            ? "rejected: a number was changed or dropped"
            : "rejected: invalid JSON shape",
      });
      if (accepted) return parsed.data.sentences;
    } catch (error) {
      await logAiCall({
        feature: "explainPay",
        model,
        latencyMs: Date.now() - started,
        fallbackUsed: true,
        error: describeAiError(error),
      });
    }
  }
  return null;
}
