import { z } from "zod";
import { getSession } from "@/server/session";
import { getRepos } from "@/server/repos";
import { checkIn, checkOut } from "@/server/services/attendance";
import { secretForSiteId } from "@/server/secrets";
import { isSameOrigin, tooLarge } from "@/server/http";

const MAX_BODY_BYTES = 16 * 1024;

const Op = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("checkin"),
    clientOpId: z.uuid(),
    createdAt: z.iso.datetime(),
    payload: z.object({ token: z.string().min(10).max(500) }),
  }),
  z.object({
    type: z.literal("checkout"),
    clientOpId: z.uuid(),
    createdAt: z.iso.datetime(),
    payload: z.object({}).optional(),
  }),
]);
const Batch = z.object({ ops: z.array(Op).min(1).max(20) });

/** Replays operations queued while the worker was offline. Safe to retry: every op is idempotent. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  if (tooLarge(request, MAX_BODY_BYTES)) return Response.json({ error: "too_large" }, { status: 413 });
  const session = await getSession();
  if (!session || session.role !== "worker") return Response.json({ error: "unauthorized" }, { status: 401 });

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return Response.json({ error: "too_large" }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  const parsed = Batch.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400 });

  const repos = getRepos();
  const now = new Date();
  const results = [];
  // Sequential: a queued check-out must apply after its check-in.
  for (const op of parsed.data.ops) {
    const at = new Date(op.createdAt);
    const result =
      op.type === "checkin"
        ? await checkIn(repos, {
            workerId: session.uid,
            orgId: session.orgId,
            token: op.payload.token,
            clientOpId: op.clientOpId,
            scannedAt: at,
            now,
            secretFor: secretForSiteId,
          })
        : await checkOut(repos, { workerId: session.uid, clientOpId: op.clientOpId, at, now });
    results.push({
      clientOpId: op.clientOpId,
      ok: result.ok,
      ...(result.ok ? { status: result.status } : { error: result.error }),
    });
  }
  return Response.json({ results });
}
