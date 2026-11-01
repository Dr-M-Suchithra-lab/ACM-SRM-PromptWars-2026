import { beforeEach, describe, expect, it } from "vitest";
import { paidAmounts } from "@/core/pay-entry";
import { payFocusMonth } from "@/core/period";
import { getRepos } from "@/server/repos";
import { resetMemoryStore } from "@/server/repos/memory";
import { savePaidRecord } from "@/server/services/pay-check";
import { buildPayroll } from "@/server/services/payroll";

beforeEach(() => resetMemoryStore());

const now = new Date();
const month = payFocusMonth(now);
const rowFor = async (workerId: string) =>
  (await buildPayroll(getRepos(), "org1", month)).find((r) => r.workerId === workerId)!;

describe("a worker recorded as paid in full", () => {
  // Every worker with nothing entered yet: none of them may show a shortfall after "Paid in full".
  it.each(["w1003", "w1005", "w1007", "w1009", "w1010", "w1011", "w1012", "w1013", "w1015", "w1016", "w1018"])(
    "%s matches FairPay Sentinel exactly",
    async (workerId) => {
      const row = await rowFor(workerId);
      expect(row.paid).toBeUndefined();
      const paid = { regularMinutes: row.regularMinutes, overtimeMinutes: row.overtimeMinutes };
      const amounts = paidAmounts(row, paid);
      expect(amounts.net).toBe(row.net);

      await savePaidRecord(
        getRepos(),
        "org1",
        "admin1",
        {
          workerId,
          month,
          // What the form sends: exact minutes as hours, not hours rounded to a quarter.
          paidRegularHours: paid.regularMinutes / 60,
          paidOvertimeHours: paid.overtimeMinutes / 60,
          grossPaid: amounts.gross,
          deductions: amounts.deductions,
          netPaid: amounts.net,
        },
        now,
      );
      const after = await rowFor(workerId);
      expect(after.check).toMatchObject({ status: "checked", findings: [], totalShortfall: 0 });
      expect(after.outstanding).toBe(0);
    },
  );
});
