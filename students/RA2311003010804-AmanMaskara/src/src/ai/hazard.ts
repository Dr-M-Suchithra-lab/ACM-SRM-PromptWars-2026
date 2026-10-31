import "server-only";
import type { Sector } from "@/core/types";
import { getAiClient, MODELS, type AiClient } from "./client";
import { hazardJsonSchema, HazardExtraction } from "./schemas";
import { hazardSystemPrompt, untrusted } from "./prompts";
import { classifyByKeywords } from "./fallback";
import { urgencyFromText } from "@/core/hazard-urgency";
import { describeAiError, logAiCall } from "./log";

export interface HazardInput {
  audioBase64?: string;
  audioMimeType?: string;
  text?: string;
  sector: Sector;
  categories: readonly string[];
  /** The worker's app language, used as a hint (speech may still mix in English) */
  locale?: string;
}

export type HazardSource = "gemini" | "gemini-fallback" | "keywords";

export interface HazardOutput extends HazardExtraction {
  source: HazardSource;
}

/**
 * Turn a spoken or typed report into a structured hazard suggestion.
 * Chain: fast model → fallback model → keyword classifier (text) → null.
 * null means "not understood": the UI falls back to the icon grid. Nothing is ever invented:
 * without Gemini, audio cannot be transcribed on the server, so the phone's own speech recognition
 * sends text instead.
 * The result is only a suggestion: the worker confirms it. Severity is Gemini's reading of the
 * situation, which code can only raise (category floors in core/hazard-rules, urgent words in
 * core/hazard-urgency), never lower.
 */
export async function extractHazard(
  input: HazardInput,
  client: AiClient | null = getAiClient(),
): Promise<HazardOutput | null> {
  const allowed = [...input.categories, "other"];

  if (client) {
    const parts = input.audioBase64
      ? [
          { text: "Classify the attached audio report." },
          { inlineData: { mimeType: input.audioMimeType ?? "audio/webm", data: input.audioBase64 } },
        ]
      : [{ text: untrusted(input.text ?? "") }];

    for (const [index, model] of [MODELS.fast, MODELS.fallback].entries()) {
      const started = Date.now();
      try {
        const raw = await client.generateText({
          model,
          system: hazardSystemPrompt(input.sector, allowed, input.locale),
          parts,
          jsonSchema: hazardJsonSchema,
        });
        const parsed = HazardExtraction.safeParse(JSON.parse(raw));
        await logAiCall({
          feature: "hazard",
          model,
          latencyMs: Date.now() - started,
          fallbackUsed: index > 0,
          error: parsed.success ? undefined : "rejected: invalid JSON shape",
        });
        if (parsed.success) {
          const category = allowed.includes(parsed.data.category) ? parsed.data.category : "other";
          return { ...parsed.data, category, source: index === 0 ? "gemini" : "gemini-fallback" };
        }
      } catch (error) {
        await logAiCall({
          feature: "hazard",
          model,
          latencyMs: Date.now() - started,
          fallbackUsed: true,
          error: describeAiError(error),
        });
      }
    }
  }

  if (input.text) {
    return {
      transcript: input.text.slice(0, 500),
      transcriptEn: "",
      category: classifyByKeywords(input.text, input.categories),
      severityHint: urgencyFromText(input.text) ?? "medium",
      locationHint: "",
      source: "keywords",
    };
  }
  return null;
}
