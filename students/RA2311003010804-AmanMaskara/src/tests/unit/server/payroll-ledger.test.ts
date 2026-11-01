import { beforeEach, describe, expect, it } from "vitest";
import { payFocusMonth } from "@/core/period";
import { getRepos } from "@/server/repos";
import { resetMemoryStore } from "@/server/repos/memory";
import { buildLedger } from "@/server/services/payroll-ledger";
import { buildPayroll } from "@/server/services/payroll";
import { payoutOverview, startCheckout } from "@/server/services/payouts";
import { createSimulatedCheckout } from "@/server/payouts/simulated";

beforeEach(() => resetMemoryStore());

const now = new Date();
const month = payFocusMonth(now);

async function ledger() {
  const rows = await buildPayroll(getRepos(), "org1", month);
  return { payroll: rows, ...buildLedger(rows, await payoutOverview(getRepos(), "org1", month, rows)) };
}

describe("the payroll ledger", () => {
  it("gives each worker the status an employer acts on, and how a checkout would pay them", async () => {
    const { payroll, rows: ledgerRows } = await ledger();
    const of = new Map(payroll.map((r) => [r.workerId, r]));
    const row = new Map(ledgerRows.map((r) => [r.workerId, r]));

    // Ramesh: overtime short-paid; a checkout pays exactly the gap.
    expect(row.get("w1001")).toMatchObject({
      status: "shortfall",
      due: { kind: "gap", amount: of.get("w1001")!.outstanding },
    });
    // Arun: nothing recorded; a checkout pays the month.
    expect(row.get("w1002")).toMatchObject({
      status: "not_entered",
      paid: null,
      due: { kind: "salary", amount: of.get("w1002")!.net },
    });
    // Dinesh paid exactly; Babu's gap was paid as arrears, which counts as paid.
    expect(row.get("w1004")).toMatchObject({ status: "matches", due: null, paid: of.get("w1004")!.paid!.netPaid });
    expect(row.get("w1008")).toMatchObject({
      status: "gap_paid",
      paid: of.get("w1008")!.paid!.netPaid + of.get("w1008")!.arrearsPaid,
    });
    // "Record pay" can add to Ramesh's and Gopal's partial pay and fill in Arun's; Dinesh is paid in
    // full and Babu's gap is paid, so theirs are closed.
    expect(["w1001", "w1014", "w1002", "w1004", "w1008"].map((id) => row.get(id)?.recordable)).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
    expect(row.get("w1014")?.recorded).toMatchObject({ net: of.get("w1014")!.paid!.netPaid });
    expect(row.get("w1002")?.recorded).toBeNull();
    // Valli has no bank details: due, but nowhere to send it yet.
    expect(row.get("w1017")).toMatchObject({ account: null, due: { kind: "salary" } });
    expect(row.get("w1001")?.account?.masked).toMatch(/^••••\d{4}$/);
  });

  it("shows a worker in an unpaid checkout as waiting", async () => {
    await startCheckout(getRepos(), createSimulatedCheckout(getRepos()), {
      orgId: "org1",
      adminId: "admin1",
      month,
      origin: "https://fairshift.test",
      workerIds: ["w1003"],
      randomHex: "c".repeat(12),
      now,
    });
    const { rows: ledgerRows } = await ledger();
    expect(ledgerRows.find((r) => r.workerId === "w1003")).toMatchObject({
      status: "waiting",
      lock: "waiting",
      recordable: false,
    });
    expect(ledgerRows.find((r) => r.workerId === "w1002")?.lock).toBeNull();
  });

  it("totals the month: due, recorded as paid, open shortfalls and who is not entered", async () => {
    const { payroll: rows, summary } = await ledger();
    expect(summary.workers).toBe(rows.length);
    expect(summary.due).toBe(rows.reduce((sum, r) => sum + r.net, 0));
    expect(summary.recorded).toBe(rows.filter((r) => r.paid).length);
    expect(summary.paid).toBe(rows.reduce((sum, r) => sum + (r.paid ? r.paid.netPaid + r.arrearsPaid : 0), 0));
    const short = rows.filter((r) => r.paid && r.outstanding > 0);
    expect(summary.shortfalls).toEqual({
      count: short.length,
      amount: short.reduce((sum, r) => sum + r.outstanding, 0),
    });
    expect(summary.shortfalls.count).toBeGreaterThan(0);
    expect(summary.notEntered).toBe(rows.filter((r) => !r.paid).length);
  });
});
