import { z } from "zod";
import { getSession } from "@/server/session";
import { getRepos } from "@/server/repos";
import { RateLimiter } from "@/server/rate-limit";
import { isSameOrigin, tooLarge } from "@/server/http";
import { getSectorProfile } from "@/core/sectors";
import { extractHazard } from "@/ai/hazard";

const MAX_AUDIO_BYTES = 1024 * 1024;
const AUDIO_TYPES = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/aac"];
const limiter = new RateLimiter({ maxTokens: 10, refillIntervalMs: 60_000 });

/** Audio (or typed text) → suggested hazard category. Nothing is saved here; the worker confirms first. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  if (tooLarge(request, MAX_AUDIO_BYTES + 16 * 1024)) return Response.json({ error: "too_large" }, { status: 413 });
  const session = await getSession();
  if (!session || session.role !== "worker") return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!limiter.check(session.uid)) return Response.json({ error: "rate_limited" }, { status: 429 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  const audio = form.get("audio");
  const text = z.string().trim().min(2).max(1000).safeParse(form.get("text"));
  if (!(audio instanceof File) && !text.success) return Response.json({ error: "invalid" }, { status: 400 });

  let audioBase64: string | undefined;
  let audioMimeType: string | undefined;
  if (audio instanceof File) {
    audioMimeType = audio.type.split(";")[0];
    if (audio.size > MAX_AUDIO_BYTES) return Response.json({ error: "too_large" }, { status: 413 });
    if (!AUDIO_TYPES.includes(audioMimeType)) return Response.json({ error: "unsupported" }, { status: 415 });
    audioBase64 = Buffer.from(await audio.arrayBuffer()).toString("base64");
  }

  const org = await getRepos().orgs.getById(session.orgId);
  if (!org) return Response.json({ error: "unauthorized" }, { status: 401 });
  const result = await extractHazard({
    audioBase64,
    audioMimeType,
    text: text.success ? text.data : undefined,
    sector: org.sector,
    categories: getSectorProfile(org.sector).hazardCategories,
    locale: z.enum(["en", "hi", "ta", "te"]).catch("en").parse(form.get("locale")),
  });
  return Response.json(result ? { understood: true, ...result } : { understood: false });
}
