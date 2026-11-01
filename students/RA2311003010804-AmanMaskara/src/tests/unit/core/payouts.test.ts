import { describe, expect, it } from "vitest";
import {
  batchIdFor,
  isValidAccount,
  isValidHolder,
  isValidIfsc,
  mapLinkStatus,
  maskAccount,
  MIN_PAYOUT,
  normaliseAccount,
  normaliseHolder,
  normaliseIfsc,
  paiseToRupees,
  payableFor,
  payLocks,
  summariseBatch,
  transferIdFor,
} from "@/core/payouts";

describe("what a worker can be paid", () => {
  it("is the whole net pay when nothing is recorded for the month", () => {
    expect(payableFor({ net: 18_400_00, outstanding: 0, hasRecord: false })).toEqual({
      kind: "salary",
      amount: 18_400_00,
    });
  });

  it("is exactly the open gap when a record exists", () => {
    expect(payableFor({ net: 18_400_00, outstanding: 907_00, hasRecord: true })).toEqual({
      kind: "gap",
      amount: 907_00,
    });
  });

  it("is nothing when the record matches, or the amount is under the ₹1 minimum", () => {
    expect(payableFor({ net: 18_400_00, outstanding: 0, hasRecord: true })).toBeNull();
    expect(payableFor({ net: MIN_PAYOUT - 1, outstanding: 0, hasRecord: false })).toBeNull();
    expect(payableFor({ net: 0, outstanding: MIN_PAYOUT - 1, hasRecord: true })).toBeNull();
    expect(payableFor({ net: MIN_PAYOUT, outstanding: 0, hasRecord: false })?.amount).toBe(MIN_PAYOUT);
  });
});

describe("bank details", () => {
  it("accepts RBI-format IFSCs only", () => {
    expect(isValidIfsc("YESB0000262")).toBe(true);
    expect(isValidIfsc("HDFC0CAGSBK")).toBe(true);
    expect(isValidIfsc("YESB1000262")).toBe(false); // fifth character must be 0
    expect(isValidIfsc("YES0000262")).toBe(false);
    expect(isValidIfsc("yesb0000262")).toBe(false);
    expect(normaliseIfsc(" yesb0000262 ")).toBe("YESB0000262");
  });

  it("accepts 9 to 18 digit account numbers, ignoring spaces and dashes", () => {
    expect(isValidAccount("123456789")).toBe(true);
    expect(isValidAccount("123456789012345678")).toBe(true);
    expect(isValidAccount("12345678")).toBe(false);
    expect(isValidAccount("1234567890123456789")).toBe(false);
    expect(isValidAccount("12345678a")).toBe(false);
    expect(normaliseAccount("0262 9180-0001 191")).toBe("026291800001191");
  });

  it("accepts names in any script, and refuses digits or symbols", () => {
    expect(isValidHolder("Ramesh Kumar")).toBe(true);
    expect(isValidHolder("सुनीता देवी")).toBe(true);
    expect(isValidHolder("ரமேஷ் குமார்")).toBe(true);
    expect(isValidHolder("Mohd. Arif")).toBe(true);
    expect(isValidHolder("R")).toBe(false);
    expect(isValidHolder("Ramesh 123")).toBe(false);
    expect(isValidHolder("<script>")).toBe(false);
    expect(normaliseHolder("  Ramesh   Kumar ")).toBe("Ramesh Kumar");
  });

  it("shows only the last four digits", () => {
    expect(maskAccount("026291800001191")).toBe("••••1191");
  });
});

describe("batch bookkeeping", () => {
  it("builds provider-safe ids: letters, digits and underscores only", () => {
    const batchId = batchIdFor("2026-10", "a1b2c3d4e5f6ff");
    expect(batchId).toBe("fs202610_a1b2c3d4e5f6");
    expect(batchIdFor("2026-10", "a1-b2;c3d4e5f6a7")).toBe("fs202610_a1b2c3d4e5f6");
    expect(transferIdFor(batchId, 0)).toBe("fs202610_a1b2c3d4e5f6_1");
    expect(transferIdFor(batchId, 24).length).toBeLessThanOrEqual(40);
  });

  it("treats only a PAID link as paid, and only a dead link as failed", () => {
    expect(mapLinkStatus("PAID")).toBe("paid");
    expect(mapLinkStatus("paid")).toBe("paid");
    for (const s of ["EXPIRED", "CANCELLED", "TERMINATED"]) expect(mapLinkStatus(s)).toBe("failed");
    for (const s of ["ACTIVE", "PARTIALLY_PAID", "anything"]) expect(mapLinkStatus(s)).toBe("pending");
  });

  it("totals a batch by outcome", () => {
    expect(
      summariseBatch([
        { status: "paid", amount: 100_00 },
        { status: "paid", amount: 50_00 },
        { status: "failed", amount: 70_00 },
        { status: "pending", amount: 30_00 },
      ]),
    ).toEqual({ paid: 2, failed: 1, pending: 1, paidAmount: 150_00 });
  });

  it("converts paise to the rupees payment APIs expect", () => {
    expect(paiseToRupees(90_750)).toBe(907.5);
    expect(paiseToRupees(1)).toBe(0.01);
  });
});

describe("whose pay record a checkout locks", () => {
  it("locks a worker paid by a checkout, and one waiting in a checkout; a failed share locks nothing", () => {
    const locks = payLocks([
      { workerId: "paid", status: "paid" },
      { workerId: "waiting", status: "pending" },
      { workerId: "failed", status: "failed" },
    ]);
    expect(Object.fromEntries(locks)).toEqual({ paid: "paid", waiting: "waiting" });
  });

  it("says waiting while any checkout for the worker is still open", () => {
    const items = [
      { workerId: "w1", status: "paid" as const },
      { workerId: "w1", status: "pending" as const },
    ];
    expect(payLocks(items).get("w1")).toBe("waiting");
    expect(payLocks(items.toReversed()).get("w1")).toBe("waiting");
  });
});
