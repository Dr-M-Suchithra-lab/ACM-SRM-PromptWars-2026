import { getSession } from "@/server/session";
import { getRepos } from "@/server/repos";
import { toCsv } from "@/core/csv";
import { monthKey } from "@/core/period";
import { PAID_CSV_HEADER } from "@/server/services/pay-check";

/** Admin-only CSV template for recording what was actually paid, pre-filled with the team's codes. */
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") return new Response("Unauthorized", { status: 401 });
  const workers = await getRepos().workers.getByOrg(session.orgId);
  const month = monthKey(new Date(), -1);
  const csv = toCsv([[...PAID_CSV_HEADER], ...workers.map((w) => [w.code, month, "", "", "", "", ""])]);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="fairshift-paid-template-${month}.csv"`,
      "cache-control": "no-store",
    },
  });
}
