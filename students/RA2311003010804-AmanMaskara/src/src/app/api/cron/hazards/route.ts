import { timingSafeEqual } from "node:crypto";
import { getRepos } from "@/server/repos";
import { sweepHazards } from "@/server/services/hazards";

/**
 * Escalates overdue hazards and auto-closes unanswered fixes for every organisation.
 * Hazards are also swept whenever they are viewed; this endpoint lets Cloud Scheduler do it
 * on a timer (e.g. every 15 minutes) with `Authorization: Bearer $CRON_SECRET`.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  if (!secret || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const repos = getRepos();
  const now = new Date();
  const orgs = await repos.orgs.getAll();
  await Promise.all(orgs.map((org) => sweepHazards(repos, org.id, now)));
  return Response.json({ swept: orgs.length, at: now.toISOString() });
}
