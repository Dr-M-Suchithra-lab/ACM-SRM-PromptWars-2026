import { z } from "zod";
import { getSession } from "@/server/session";
import { getRepos } from "@/server/repos";
import { RateLimiter } from "@/server/rate-limit";
import { clientIp, isSameOrigin, tooLarge } from "@/server/http";
import { speechFor } from "@/ai/tts";
import { LANGUAGE_LABELS, locales } from "@/i18n/locales";

const MAX_BODY_BYTES = 4 * 1024;
const Body = z.object({ text: z.string().trim().min(1).max(400), locale: z.enum(locales) });
const limiter = new RateLimiter({ maxTokens: 30, refillIntervalMs: 10 * 60 * 1000 });

/** Before login only the language names on the language screen can be spoken. */
const PUBLIC_PHRASES = new Set(Object.values(LANGUAGE_LABELS).map((l) => l.native));

/**
 * Read-aloud fallback for devices with no voice for the language (often Tamil and Telugu on
 * desktop). Returns cached WAV audio, or 204 so the client shows "Audio not available".
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  if (tooLarge(request, MAX_BODY_BYTES)) return Response.json({ error: "too_large" }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse((await request.text()).slice(0, MAX_BODY_BYTES));
  } catch {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400 });

  const session = await getSession();
  if (!session && !PUBLIC_PHRASES.has(parsed.data.text))
    return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!limiter.check(session?.uid ?? `ip:${clientIp(request)}`))
    return Response.json({ error: "rate_limited" }, { status: 429 });

  const wav = await speechFor(getRepos(), parsed.data.locale, parsed.data.text);
  if (!wav) return new Response(null, { status: 204 });
  return new Response(new Uint8Array(wav), {
    headers: { "content-type": "audio/wav", "cache-control": "private, max-age=86400" },
  });
}
