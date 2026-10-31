import { getRepos } from "@/server/repos";
import { hasGemini } from "@/ai/client";

/**
 * Liveness, a datastore round-trip time and whether Gemini is configured.
 * Reports only ok/error, latency and yes/no flags, never connection details or keys.
 */
export async function GET() {
  const backend = process.env.MONGODB_URI ? "mongodb" : "memory";
  const region = process.env.VERCEL_REGION ?? process.env.K_SERVICE ?? "local";
  const ai = hasGemini() ? "configured" : "missing_key";
  try {
    await getRepos().orgs.getAll(); // first call also opens the pooled connection
    const started = Date.now();
    await getRepos().orgs.getAll();
    return Response.json({ status: "ok", db: backend, dbMs: Date.now() - started, region, ai });
  } catch {
    return Response.json({ status: "degraded", db: backend, dbStatus: "error", region, ai }, { status: 503 });
  }
}
