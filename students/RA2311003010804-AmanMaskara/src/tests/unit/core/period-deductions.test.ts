import { describe, expect, it } from "vitest";
import { isMonthKey, monthKey, monthRange, payFocusMonth } from "@/core/period";
import { computeDeductions, PF_RATE } from "@/core/deductions";
import { orderOps, settledOpIds, type QueuedOp } from "@/lib/offline-queue";

describe("pay periods (IST months)", () => {
  it("uses the IST month, not UTC", () => {
    // 20:00 UTC on Oct 31 is already Nov 1 in India
    expect(monthKey(new Date("2026-10-31T20:00:00Z"))).toBe("2026-11");
    expect(monthKey(new Date("2026-01-15T10:00:00Z"), -1)).toBe("2025-12");
  });

  it("bounds a month at IST midnight", () => {
    const { start, end } = monthRange("2026-10");
    expect(start.toISOString()).toBe("2026-09-30T18:30:00.000Z");
    expect(end.toISOString()).toBe("2026-10-31T18:30:00.000Z");
  });

  it("validates month keys", () => {
    expect(isMonthKey("2026-10")).toBe(true);
    expect(isMonthKey("2026-13")).toBe(false);
    expect(isMonthKey("../etc")).toBe(false);
  });
});

describe("pay focus month (payday window)", () => {
  // IST midnight is 18:30 UTC the day before.
  it("opens on last month for the first 7 days of a month, then on this month", () => {
    expect(payFocusMonth(new Date("2026-10-31T12:00:00Z"))).toBe("2026-10");
    expect(payFocusMonth(new Date("2026-10-31T18:30:00Z"))).toBe("2026-10"); // 1 Nov, 00:00 IST
    expect(payFocusMonth(new Date("2026-11-07T18:29:00Z"))).toBe("2026-10"); // 7 Nov, 23:59 IST
    expect(payFocusMonth(new Date("2026-11-07T18:30:00Z"))).toBe("2026-11"); // 8 Nov, 00:00 IST
  });

  it("crosses the year boundary", () => {
    expect(payFocusMonth(new Date("2027-01-03T06:00:00Z"))).toBe("2026-12");
  });
});

describe("deductions", () => {
  it("takes 12% PF of regular pay in whole paise", () => {
    expect(computeDeductions(100_001)).toEqual([{ label: "pf", amount: Math.round(100_001 * PF_RATE) }]);
    expect(computeDeductions(0)).toEqual([]);
  });
});

describe("offline queue helpers", () => {
  it("replays oldest first so check-out never precedes check-in", () => {
    const ops: QueuedOp[] = [
      { type: "checkout", clientOpId: "b", createdAt: "2026-10-27T10:00:00.000Z" },
      { type: "checkin", clientOpId: "a", createdAt: "2026-10-27T02:00:00.000Z", payload: { token: "t" } },
    ];
    expect(orderOps(ops).map((o) => o.clientOpId)).toEqual(["a", "b"]);
  });

  it("removes every op the server answered, success or permanent rejection", () => {
    expect(
      settledOpIds([
        { clientOpId: "a", ok: true },
        { clientOpId: "b", ok: false, error: "expired_qr" },
      ]),
    ).toEqual(["a", "b"]);
  });
});
