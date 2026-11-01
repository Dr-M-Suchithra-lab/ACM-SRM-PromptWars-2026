import { afterEach, describe, expect, it, vi } from "vitest";
import { getRepos } from "@/server/repos";
import { resetMemoryStore } from "@/server/repos/memory";
import { payCheckFor } from "@/server/services/pay-check";
import { buildPayroll } from "@/server/services/payroll";
import { payFocusMonth } from "@/core/period";

afterEach(() => {
  vi.useRealTimers();
  resetMemoryStore();
});

// The demo is seeded relative to "now". Whatever day a judge opens it, including the first days
// of a new month, the pay screens must open on the story the README and demo script describe.
const DAYS = [
  "2026-10-31T06:00:00Z",
  "2026-10-31T19:00:00Z", // 1 Nov IST, a Sunday
  "2026-11-02T06:00:00Z",
  "2026-11-07T06:00:00Z",
  "2026-11-08T06:00:00Z", // first day the story moves to November
  "2026-11-25T06:00:00Z",
];

describe.each(DAYS)("the demo pay story on %s", (iso) => {
  const open = () => {
    vi.useFakeTimers({ now: new Date(iso), toFake: ["Date"] });
    resetMemoryStore();
    return { repos: getRepos(), month: payFocusMonth(new Date()) };
  };

  it("shows Ramesh's ₹907 possible overtime shortfall", async () => {
    const { repos, month } = open();
    const check = (await payCheckFor(repos, "w1001", month))!;
    expect(check.outstanding).toBe(90_667);
    expect(check.result.findings.map((f) => f.code)).toEqual(["OVERTIME_UNDERPAID"]);
  });

  it("shows one payroll row for each outcome the employer can see", async () => {
    const { repos, month } = open();
    const row = Object.fromEntries((await buildPayroll(repos, "org1", month)).map((r) => [r.name, r]));
    expect(row["Arun Yadav"].check.status).toBe("no_record");
    expect(row["Dinesh Singh"]).toMatchObject({ outstanding: 0, arrearsPaid: 0, check: { status: "checked" } });
    // Amounts depend on the day's hours by a paisa or so; the screen shows whole rupees.
    const rupees = (paise: number) => Math.round(paise / 100);
    expect(row["Babu Rajan"].outstanding).toBe(0);
    expect(rupees(row["Babu Rajan"].arrearsPaid)).toBe(692); // "Gap paid ₹692"
    expect(row["Gopal Das"].arrearsPaid).toBe(0);
    expect(rupees(row["Gopal Das"].outstanding)).toBe(832); // "Possible shortfall ₹832"
  });
});
