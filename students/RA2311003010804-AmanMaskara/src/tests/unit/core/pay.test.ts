import { describe, expect, it } from "vitest";
import { computePayslip, deriveHourlyRate } from "@/core/pay";
import { DEFAULT_LABOUR_RULES as RULES } from "@/core/overtime";
import { dayShifts } from "../helpers";

describe("deriveHourlyRate (paise)", () => {
  it("keeps hourly rates", () => {
    expect(deriveHourlyRate({ basis: "hourly", rate: 12_000 }, RULES)).toBe(12_000);
  });

  it("divides a daily wage by daily hours", () => {
    expect(deriveHourlyRate({ basis: "daily", rate: 80_000 }, RULES)).toBe(10_000);
  });

  it("divides a monthly salary by 26 working days", () => {
    expect(deriveHourlyRate({ basis: "monthly", rate: 2_080_000 }, RULES)).toBe(10_000);
    // ₹18,000 / 208h = 8653.846… paise → rounds to 8654
    expect(deriveHourlyRate({ basis: "monthly", rate: 1_800_000 }, RULES)).toBe(8654);
  });
});

describe("computePayslip", () => {
  it("pays a daily-wage worker exactly one wage per 8h day", () => {
    const slip = computePayslip(
      "w1",
      "2026-10",
      dayShifts("2026-10-05", 5, 8),
      { basis: "daily", rate: 80_000 },
      RULES,
    );
    expect(slip.gross).toBe(400_000);
    expect(slip.net).toBe(400_000);
    expect(slip.lines).toHaveLength(1);
    expect(slip.overtimeBasis).toBe("none");
  });

  it("pays overtime at twice the hourly rate", () => {
    // 2 × 10h days: 16h regular + 4h OT. ₹100/h → ₹1,600 + 4 × ₹200 = ₹2,400
    const slip = computePayslip(
      "w1",
      "2026-10",
      dayShifts("2026-10-05", 2, 10),
      { basis: "daily", rate: 80_000 },
      RULES,
    );
    const ot = slip.lines.find((l) => l.kind === "overtime");
    expect(ot).toMatchObject({ minutes: 240, rate: 20_000, amount: 80_000 });
    expect(slip.gross).toBe(240_000);
  });

  it("subtracts deductions from gross", () => {
    const slip = computePayslip(
      "w1",
      "2026-10",
      dayShifts("2026-10-05", 1, 8),
      { basis: "daily", rate: 80_000 },
      RULES,
      [{ label: "PF", amount: 9_600 }],
    );
    expect(slip.deductions).toEqual([{ kind: "deduction", label: "PF", amount: 9_600 }]);
    expect(slip.net).toBe(70_400);
  });

  it("returns whole paise for awkward minutes", () => {
    const shifts = dayShifts("2026-10-05", 1, 8 + 7 / 60);
    const slip = computePayslip("w1", "2026-10", shifts, { basis: "monthly", rate: 1_800_000 }, RULES);
    for (const line of slip.lines) expect(Number.isInteger(line.amount)).toBe(true);
  });

  it("handles a period with no shifts", () => {
    const slip = computePayslip("w1", "2026-10", [], { basis: "daily", rate: 80_000 }, RULES);
    expect(slip.gross).toBe(0);
    expect(slip.workerId).toBe("w1");
  });
});
