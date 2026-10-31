import "server-only";
import { createHash } from "node:crypto";
import type { Repos } from "@/server/repos/types";
import { getAiClient, MODELS, type AiClient } from "./client";
import { describeAiError, logAiCall } from "./log";
import { pcmToWav } from "./wav";

/**
 * Server-side speech for languages the phone or desktop has no voice for (often Tamil and
 * Telugu on desktop browsers). Audio is cached by locale + text, so a fixed UI sentence is
 * synthesised once and then served from the cache.
 */
export function ttsCacheKey(locale: string, text: string): string {
  return createHash("sha256").update(`${locale}|${text}`).digest("hex");
}

export async function speechFor(
  repos: Repos,
  locale: string,
  text: string,
  client: AiClient | null = getAiClient(),
): Promise<Buffer | null> {
  const key = ttsCacheKey(locale, text);
  const cached = await repos.ttsCache.get(key);
  if (cached) return Buffer.from(cached, "base64");
  if (!client) return null;

  const started = Date.now();
  try {
    const pcm = await client.synthesizeSpeech(text);
    await logAiCall({
      feature: "tts",
      model: MODELS.tts,
      latencyMs: Date.now() - started,
      fallbackUsed: false,
      error: pcm ? undefined : "no audio returned",
    });
    if (!pcm) return null;
    const wav = pcmToWav(Buffer.from(pcm, "base64"));
    await repos.ttsCache.set(key, wav.toString("base64"));
    return wav;
  } catch (error) {
    await logAiCall({
      feature: "tts",
      model: MODELS.tts,
      latencyMs: Date.now() - started,
      fallbackUsed: true,
      error: describeAiError(error),
    });
    return null;
  }
}
