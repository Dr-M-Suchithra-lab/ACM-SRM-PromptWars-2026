import { beforeEach, describe, expect, it } from "vitest";
import { monthKey, payFocusMonth } from "@/core/period";
import { getRepos } from "@/server/repos";
import { resetMemoryStore } from "@/server/repos/memory";
import type { CheckoutProvider } from "@/server/payouts/provider";
import { createSimulatedCheckout } from "@/server/payouts/simulated";
import { buildPayroll } from "@/server/services/payroll";
import { importPaidCsv, PAID_CSV_HEADER, payArrears, savePaidRecord } from "@/server/services/pay-check";
import { withPayrollLock } from "@/server/services/pay-lock";
import {
  answerPayoutAccount,
  cancelCheckout,
  confirmCheckout,
  payoutOverview,
  savePayoutAccount,
  startCheckout,
} from "@/server/services/payouts";

const now = new Date();
const month = payFocusMonth(now);
const admin = { orgId: "org1", adminId: "admin1", month, origin: "https://fairshift.test", now };
let hexSeq = 0;
const randomHex = () => (++hexSeq).toString(16).padStart(12, "0");

beforeEach(() => resetMemoryStore());

/** A Cashfree stand-in that takes a moment to answer, like the real one, so requests overlap. */
function slowProvider(status: "paid" | "pending" = "pending"): CheckoutProvider {
  const wait = () => new Promise((resolve) => setTimeout(resolve, 20));
  return {
    name: "cashfree",
    create: async (request) => {
      await wait();
      return { url: `https://payments-test.cashfree.com/links/${request.batchId}` };
    },
    status: async () => {
      await wait();
      return status;
    },
    cancel: async () => {},
  };
}

const rowOf = async (workerId: string) =>
  (await buildPayroll(getRepos(), "org1", month)).find((r) => r.workerId === workerId)!;

/** What the form sends for "Paid in full": every minute, and the payslip's own amounts. */
const paidInFull = async (workerId: string) => {
  const row = await rowOf(workerId);
  return {
    workerId,
    month,
    paidRegularHours: row.regularMinutes / 60,
    paidOvertimeHours: row.overtimeMinutes / 60,
    grossPaid: row.gross,
    deductions: row.deductions,
    netPaid: row.net,
  };
};

describe("Record pay: what was paid can be added to, never taken back", () => {
  it("a partly paid month accepts the rest, then closes", async () => {
    // Gopal: 9h 47m of regular hours were left off his pay sheet.
    const before = await rowOf("w1014");
    expect(before.outstanding).toBeGreaterThan(0);
    const record = before.paid!;
    const lower = {
      workerId: "w1014",
      month,
      paidRegularHours: record.paidRegularHours - 1,
      paidOvertimeHours: record.paidOvertimeHours,
      grossPaid: record.grossPaid,
      deductions: record.deductions,
      netPaid: record.netPaid,
    };
    expect(await savePaidRecord(getRepos(), "org1", "admin1", lower, now)).toEqual({
      ok: false,
      error: "below_recorded",
    });
    expect(
      await savePaidRecord(
        getRepos(),
        "org1",
        "admin1",
        { ...lower, paidRegularHours: record.paidRegularHours, netPaid: record.netPaid - 1 },
        now,
      ),
    ).toEqual({ ok: false, error: "below_recorded" });
    expect((await rowOf("w1014")).paid).toEqual(record);

    expect(await savePaidRecord(getRepos(), "org1", "admin1", await paidInFull("w1014"), now)).toEqual({ ok: true });
    expect((await rowOf("w1014")).outstanding).toBe(0);
    // Paid in full now: lowering it would reopen a gap that could be paid again.
    expect(await savePaidRecord(getRepos(), "org1", "admin1", lower, now)).toEqual({ ok: false, error: "settled" });
  });

  it("a month already paid in full can't be changed", async () => {
    // Dinesh was paid exactly.
    const record = (await rowOf("w1004")).paid!;
    const zero = {
      workerId: "w1004",
      month,
      paidRegularHours: 0,
      paidOvertimeHours: 0,
      grossPaid: 0,
      deductions: 0,
      netPaid: 0,
    };
    expect(await savePaidRecord(getRepos(), "org1", "admin1", zero, now)).toEqual({ ok: false, error: "settled" });
    expect((await rowOf("w1004")).paid).toEqual(record);
  });

  it("a CSV row follows the same rules", async () => {
    const [gopal, dinesh] = await Promise.all([rowOf("w1014"), rowOf("w1004")]);
    const csv = [
      PAID_CSV_HEADER.join(","),
      `${gopal.code},${month},0,0,0,0,0`,
      `${dinesh.code},${month},0,0,0,0,0`,
    ].join("\n");
    expect(await importPaidCsv(getRepos(), "org1", "admin1", csv, now)).toEqual({
      saved: 0,
      errors: [
        { row: 1, reason: "below_recorded" },
        { row: 2, reason: "settled" },
      ],
    });
  });
});

describe("two requests at the same moment", () => {
  it("two checkouts can't both claim a worker", async () => {
    const provider = slowProvider();
    const results = await Promise.all([
      startCheckout(getRepos(), provider, { ...admin, workerIds: ["w1003"], randomHex: randomHex() }),
      startCheckout(getRepos(), provider, { ...admin, workerIds: ["w1003"], randomHex: randomHex() }),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toEqual({
      ok: false,
      error: "rejected",
      rejected: [{ workerId: "w1003", reason: "in_progress" }],
    });
    expect(await getRepos().payoutBatches.getByOrgMonth("org1", month)).toHaveLength(1);
  });

  it("a payment confirmed twice at once (return link and Check status) is recorded once", async () => {
    const owed = (await rowOf("w1014")).outstanding;
    const started = await startCheckout(getRepos(), slowProvider(), {
      ...admin,
      workerIds: ["w1014"],
      randomHex: randomHex(),
    });
    if (!started.ok) throw new Error("expected a checkout");
    const paid = slowProvider("paid");
    await Promise.all([
      confirmCheckout(getRepos(), paid, { orgId: "org1", batchId: started.batchId, now }),
      confirmCheckout(getRepos(), paid, { orgId: "org1", batchId: started.batchId, now }),
    ]);
    expect((await getRepos().paidRecords.get("w1014", month))?.arrears?.map((a) => a.amount)).toEqual([owed]);
  });

  it("'Mark as paid' tapped twice records the gap once", async () => {
    const owed = (await rowOf("w1014")).outstanding;
    const input = { orgId: "org1", adminId: "admin1", workerId: "w1014", month, now };
    const results = await Promise.all([payArrears(getRepos(), input), payArrears(getRepos(), input)]);
    expect(results).toContainEqual({ ok: true, amount: owed });
    expect(results).toContainEqual({ ok: false, error: "nothing_owed" });
    expect((await getRepos().paidRecords.get("w1014", month))?.arrears).toHaveLength(1);
  });

  it("gives up with 'busy' when the payroll stays locked, and frees an expired lock", async () => {
    const repos = getRepos();
    const key = `payroll:org1:${month}`;
    expect(await repos.locks.acquire(key, "other", new Date(Date.now() + 60_000), new Date())).toBe(true);
    expect(await withPayrollLock(repos, "org1", month, async () => "ran", 50)).toBe("busy");
    // Only the holder can free it; an expired lock can be taken over.
    await repos.locks.release(key, "someone-else");
    expect(await repos.locks.acquire(key, "third", new Date(Date.now() + 60_000), new Date())).toBe(false);
    expect(await repos.locks.acquire(key, "third", new Date(Date.now() + 120_000), new Date(Date.now() + 61_000))).toBe(
      true,
    );
    await repos.locks.release(key, "third");
    expect(await withPayrollLock(repos, "org1", month, async () => "ran", 50)).toBe("ran");
  });
});

describe("bank details the worker said aren't theirs", () => {
  it("entering the same account again asks the worker again", async () => {
    const account = {
      orgId: "org1",
      adminId: "admin1",
      workerId: "w1017",
      holder: "Valli Ammal",
      account: "1233943142",
      ifsc: "ICIC0000009",
      now,
    };
    await savePayoutAccount(getRepos(), account);
    await answerPayoutAccount(getRepos(), { workerId: "w1017", confirm: false, now });
    // The worker tapped "No" by mistake; the employer enters the same account again.
    const again = await savePayoutAccount(getRepos(), account);
    expect(again.ok && again.account.status).toBe("pending_worker");
    expect(await answerPayoutAccount(getRepos(), { workerId: "w1017", confirm: true, now })).toEqual({
      ok: true,
      status: "confirmed",
    });
  });
});

describe("a simulated checkout left waiting when Cashfree keys are switched on", () => {
  it("is still checked and cancelled by the simulation, so its workers are freed", async () => {
    const started = await startCheckout(getRepos(), createSimulatedCheckout(getRepos()), {
      ...admin,
      workerIds: ["w1003"],
      randomHex: randomHex(),
    });
    if (!started.ok) throw new Error("expected a checkout");
    const cashfree: CheckoutProvider = {
      name: "cashfree",
      create: async () => ({ url: "" }),
      status: async () => {
        throw new Error("link not found");
      },
      cancel: async () => {
        throw new Error("link not found");
      },
    };
    expect(await confirmCheckout(getRepos(), cashfree, { orgId: "org1", batchId: started.batchId, now })).toMatchObject(
      {
        ok: true,
        batch: { summary: { pending: 1 } },
      },
    );
    expect(await cancelCheckout(getRepos(), cashfree, { orgId: "org1", batchId: started.batchId, now })).toEqual({
      ok: true,
    });
    const { payable } = await payoutOverview(getRepos(), "org1", month);
    expect(payable.find((p) => p.workerId === "w1003")?.busy).toBe(false);
  });
});

describe("paid never exceeds what is due", () => {
  const months = [month, monthKey(now, -1), monthKey(now, -2)];
  const paidOf = (r: { paid?: { netPaid: number }; arrearsPaid: number }) => (r.paid?.netPaid ?? 0) + r.arrearsPaid;

  it("holds for every worker of both organisations, in every month the payroll shows", async () => {
    for (const orgId of ["org1", "org2"]) {
      for (const m of months) {
        for (const row of await buildPayroll(getRepos(), orgId, m)) {
          expect(paidOf(row), `${row.name} ${m}`).toBeLessThanOrEqual(row.net + 100);
        }
      }
    }
  });

  it("paying every open gap brings each worker to exactly their net pay, never above", async () => {
    for (const orgId of ["org1", "org2"]) {
      const adminId = orgId === "org1" ? "admin1" : "admin2";
      for (const m of months) {
        for (const row of await buildPayroll(getRepos(), orgId, m)) {
          if (row.outstanding > 0)
            await payArrears(getRepos(), { orgId, adminId, workerId: row.workerId, month: m, now });
        }
        for (const row of await buildPayroll(getRepos(), orgId, m)) {
          if (!row.paid) continue;
          expect(paidOf(row), `${row.name} ${m}`).toBeLessThanOrEqual(row.net + 100);
          if (row.check.findings.some((f) => f.code !== "BELOW_MINIMUM_WAGE")) {
            expect(Math.abs(paidOf(row) - row.net), `${row.name} ${m}`).toBeLessThanOrEqual(100);
          }
        }
      }
    }
  });

  it("nothing recorded as paid, then 'Mark as paid': the gap is the take-home pay, not the gross", async () => {
    // Arun had nothing entered. Recording ₹0 and paying the gap must pay his net, not his gross
    // (the PF on his wages is deposited by the employer, not handed to him).
    const arun = await rowOf("w1002");
    const zero = {
      workerId: "w1002",
      month,
      paidRegularHours: 0,
      paidOvertimeHours: 0,
      grossPaid: 0,
      deductions: 0,
      netPaid: 0,
    };
    expect(await savePaidRecord(getRepos(), "org1", "admin1", zero, now)).toEqual({ ok: true });
    expect((await rowOf("w1002")).outstanding).toBe(arun.net);
    expect(await payArrears(getRepos(), { orgId: "org1", adminId: "admin1", workerId: "w1002", month, now })).toEqual({
      ok: true,
      amount: arun.net,
    });
    expect(paidOf(await rowOf("w1002"))).toBe(arun.net);
  });

  it("Record pay can't record more than the net due, or more hours than worked", async () => {
    const full = await paidInFull("w1002");
    expect(
      await savePaidRecord(
        getRepos(),
        "org1",
        "admin1",
        { ...full, netPaid: full.netPaid + 500_00, grossPaid: full.grossPaid + 500_00 },
        now,
      ),
    ).toEqual({
      ok: false,
      error: "above_due",
    });
    expect(
      await savePaidRecord(
        getRepos(),
        "org1",
        "admin1",
        { ...full, paidOvertimeHours: full.paidOvertimeHours + 2 },
        now,
      ),
    ).toEqual({
      ok: false,
      error: "above_due",
    });
    expect(await savePaidRecord(getRepos(), "org1", "admin1", full, now)).toEqual({ ok: true });
  });

  it("the demo's 'Gap paid' row adds up: Babu got his net pay, no more", async () => {
    const babu = await rowOf("w1008");
    expect(babu.arrearsPaid).toBeGreaterThan(0);
    expect(babu.outstanding).toBe(0);
    expect(paidOf(babu)).toBe(babu.net);
  });
});
