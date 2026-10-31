import { describe, expect, it } from "vitest";
import { parseCsv, rupeesToPaise } from "@/core/csv";
import { monthlyWage } from "@/core/pay";
import { DEFAULT_LABOUR_RULES } from "@/core/overtime";
import { signToken, verifyToken } from "@/core/signed-token";
import { buildWorkHistory } from "@/core/work-history";
import { attendanceRuleMet, checkEligibility } from "@/core/eligibility";
import { checkPay } from "@/core/pay-check";
import { rankBySimilarity } from "@/core/similarity";
import { getScheme } from "@/config/schemes";
import { findMinimumWage, NATIONAL_FLOOR } from "@/config/minimum-wage";
import { dayPart, istHour } from "@/lib/day-part";
import { axisTicks } from "@/lib/axis";
import { formatAge, formatDay, formatRupees, formatWhen } from "@/lib/format";
import { dayShifts } from "../helpers";
import { createHmac } from "node:crypto";

describe("CSV import parsing", () => {
  it("handles quotes, doubled quotes, CRLF, a BOM and blank lines", () => {
    expect(parseCsv('﻿code,name\r\n1001,"Kumar, Ramesh"\r\n\r\n1002,"say ""hi"""\n1003,last')).toEqual([
      ["code", "name"],
      ["1001", "Kumar, Ramesh"],
      ["1002", 'say "hi"'],
      ["1003", "last"],
    ]);
  });

  it("reads rupees as typed in spreadsheets, and rejects anything else", () => {
    expect(rupeesToPaise("₹12,450.50")).toBe(1_245_050);
    expect(rupeesToPaise("900")).toBe(90_000);
    expect(rupeesToPaise("12.345")).toBeNaN();
    expect(rupeesToPaise("-5")).toBeNaN();
    expect(rupeesToPaise("abc")).toBeNaN();
  });
});

describe("monthly wage for wage-ceiling rules", () => {
  it.each([
    [{ basis: "monthly", rate: 1_800_000 }, 1_800_000],
    [{ basis: "daily", rate: 80_000 }, 2_080_000],
    [{ basis: "hourly", rate: 10_000 }, 2_080_000],
  ] as const)("%o → %i paise", (pay, expected) => {
    expect(monthlyWage(pay, DEFAULT_LABOUR_RULES)).toBe(expected);
  });
});

describe("token and history edge cases", () => {
  it("rejects a correctly signed token whose payload is not valid claims", () => {
    const payload = Buffer.from("not json").toString("base64url");
    const mac = createHmac("sha256", "s").update(`passport.${payload}`).digest("base64url");
    expect(verifyToken(`${payload}.${mac}`, "s", "passport", new Date())).toEqual({ ok: false, reason: "malformed" });
    const token = signToken({ kind: "passport", sub: "w1", iat: 1 }, "s");
    expect(verifyToken(token, "s", "passport", new Date())).toMatchObject({ ok: true }); // no expiry = valid
  });

  it("skips shifts at sites it does not know", () => {
    expect(buildWorkHistory(dayShifts("2026-10-01", 2, 8), new Map(), "Mason")).toEqual([]);
  });
});

describe("eligibility, pay check and similarity edge cases", () => {
  const now = new Date("2026-10-30T10:00:00+05:30");

  it("lets a worker request a certificate once the days are met, even before answering questions", () => {
    const days = Array.from({ length: 90 }, (_, i) => ({
      day: new Date(now.getTime() - (i + 1) * 86_400_000).toISOString().slice(0, 10),
      sector: "construction" as const,
    }));
    const [result] = checkEligibility({ sector: "construction", monthlyWage: 1 }, days, [getScheme("bocw")!], now);
    expect(result.eligible).toBe(false); // age not answered yet
    expect(attendanceRuleMet(result)).toBe(true);
  });

  it("finds no regular shortfall when more hours were paid than recorded", () => {
    const result = checkPay({
      attendance: { regularMinutes: 60, overtimeMinutes: 0 },
      payRules: { hourlyRate: 10_000, overtimeRate: 20_000, expectedDeductions: 0 },
      paidRecord: { paidRegularHours: 2, paidOvertimeHours: 0, grossPaid: 20_000, deductions: 0, netPaid: 20_000 },
      minimumWage: { dailyRate: 8_000, dailyHours: 8 },
    });
    expect(result.findings).toEqual([]);
  });

  it("caps similar-issue suggestions to the limit", () => {
    const items = ["water tank empty", "water tank leaking", "tank water dirty", "water tank broken"];
    expect(rankBySimilarity("water tank", items, (s) => s, 2)).toHaveLength(2);
  });

  it("falls back to the national floor wage for an unknown state", () => {
    expect(findMinimumWage("ZZ", "factory", "skilled")).toBe(NATIONAL_FLOOR);
    expect(findMinimumWage("TN", "construction", "skilled").dailyRate).toBeGreaterThan(NATIONAL_FLOOR.dailyRate);
  });
});

describe("display helpers", () => {
  it("formats ages, rupees, days and times", () => {
    expect(formatAge(3 * 86_400_000 + 4 * 3_600_000)).toBe("3d 4h");
    expect(formatAge(5 * 3_600_000 + 20 * 60_000)).toBe("5h 20m");
    expect(formatAge(12 * 60_000)).toBe("12m");
    expect(formatRupees(90_667)).toBe("₹907");
    expect(formatDay("2026-10-30")).toBe("30 Oct 2026");
    expect(formatDay("2026-10")).toBe("Oct 2026");
    expect(formatWhen(new Date("2026-10-30T08:45:00Z"))).toMatch(/30 Oct/);
  });

  it("picks whole-number chart ticks with a nice top that covers the data", () => {
    expect(axisTicks(0)).toEqual([0, 1]);
    expect(axisTicks(3)).toEqual([0, 1, 2, 3]);
    expect(axisTicks(14)).toEqual([0, 5, 10, 15]);
    expect(axisTicks(36)).toEqual([0, 10, 20, 30, 40]);
    expect(axisTicks(40)).toEqual([0, 10, 20, 30, 40]);
    expect(axisTicks(1234)).toEqual([0, 500, 1000, 1500]);
  });

  it("picks the part of the day in IST", () => {
    expect(dayPart(7)).toBe("morning");
    expect(dayPart(13)).toBe("midday");
    expect(dayPart(19)).toBe("evening");
    expect(istHour(new Date("2026-10-30T00:00:00Z"))).toBe(5); // 05:30 IST
  });
});
