import "server-only";
import { GoogleGenAI, type Part } from "@google/genai";

/**
 * Model ids from https://ai.google.dev/gemini-api/docs/models (checked 2026-10-30).
 * Override with env vars to move to a newer model without a code change.
 */
export const MODELS = {
  fast: process.env.GEMINI_MODEL_FAST ?? "gemini-3.5-flash-lite",
  fallback: process.env.GEMINI_MODEL_FALLBACK ?? "gemini-3.8-flash",
  tts: process.env.GEMINI_MODEL_TTS ?? "gemini-3.8-flash-lite-tts",
} as const;

export const CALL_TIMEOUT_MS = 8_000;
const TTS_TIMEOUT_MS = 15_000;
/** A clear, warm prebuilt voice; Gemini TTS picks the language from the text itself. */
const TTS_VOICE = "Kore";

export interface GenerateRequest {
  model: string;
  system: string;
  parts: Part[];
  jsonSchema?: unknown;
  temperature?: number;
}

/** The only surface the app uses, so tests can inject a fake. */
export interface AiClient {
  generateText(request: GenerateRequest): Promise<string>;
  /** Raw 16-bit little-endian mono PCM at 24 kHz, base64-encoded; null if no audio came back. */
  synthesizeSpeech(text: string): Promise<string | null>;
}

let client: AiClient | null | undefined;

export function hasGemini(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function getAiClient(): AiClient | null {
  if (client !== undefined) return client;
  if (!hasGemini()) {
    console.warn("[FairShift AI] GEMINI_API_KEY is not set: AI features use their deterministic fallbacks.");
    return (client = null);
  }
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  client = {
    async generateText({ model, system, parts, jsonSchema, temperature = 0.2 }) {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction: system,
          temperature,
          abortSignal: AbortSignal.timeout(CALL_TIMEOUT_MS),
          ...(jsonSchema ? { responseMimeType: "application/json", responseJsonSchema: jsonSchema } : {}),
        },
      });
      return response.text ?? "";
    },
    async synthesizeSpeech(text) {
      const response = await ai.models.generateContent({
        model: MODELS.tts,
        contents: [{ role: "user", parts: [{ text }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_VOICE } } },
          abortSignal: AbortSignal.timeout(TTS_TIMEOUT_MS),
        },
      });
      return response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData?.data ?? null;
    },
  };
  return client;
}

/** Test hook. */
export function setAiClient(next: AiClient | null | undefined): void {
  client = next;
}
