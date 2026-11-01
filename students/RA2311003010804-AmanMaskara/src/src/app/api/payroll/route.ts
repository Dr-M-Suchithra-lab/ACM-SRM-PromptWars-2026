import { getSession } from "@/server/session";
import { getRepos } from "@/server/repos";
import { buildPayroll } from "@/server/services/payroll";
import { isMonthKey, payFocusMonth } from "@/core/period";
import { paiseToRupees, toCsv } from "@/core/csv";

/** Admin-only CSV of computed hours and pay for one IST month. */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") return new Response("Unauthorized", { status: 401 });

  const requested = new URL(request.url).searchParams.get("month") ?? "";
  const month = isMonthKey(requested) ? requested : payFocusMonth(new Date());
  const rows = await buildPayroll(getRepos(), session.orgId, month);

  const csv = toCsv([
    [
      "Code",
      "Name",
      "Pay basis",
      "Days worked",
      "Regular hours",
      "Overtime hours",
      "Gross (INR)",
      "PF (INR)",
      "Net (INR)",
      "Net paid (INR)",
      "Possible shortfall (INR)",
      "Arrears paid (INR)",
      "Still owed (INR)",
    ],
    ...rows.map((r) => [
      r.code,
      r.name,
      r.basis,
      r.daysWorked,
      (r.regularMinutes / 60).toFixed(2),
      (r.overtimeMinutes / 60).toFixed(2),
      paiseToRupees(r.gross),
      paiseToRupees(r.deductions),
      paiseToRupees(r.net),
      r.paid ? paiseToRupees(r.paid.netPaid) : "",
      r.check.status === "checked" ? paiseToRupees(r.check.totalShortfall) : "",
      r.arrearsPaid ? paiseToRupees(r.arrearsPaid) : "",
      r.check.status === "checked" ? paiseToRupees(r.outstanding) : "",
    ]),
  ]);

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="fairshift-payroll-${month}.csv"`,
      "cache-control": "no-store",
    },
  });
}
