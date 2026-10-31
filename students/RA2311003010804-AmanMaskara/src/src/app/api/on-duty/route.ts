import { getSession } from "@/server/session";
import { getRepos } from "@/server/repos";
import { onDutyCount } from "@/server/services/workforce";

/** Admin-only live headcount for the menu, so pages never wait on it and it stays fresh between them. */
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(await onDutyCount(getRepos(), session.orgId), { headers: { "cache-control": "no-store" } });
}
