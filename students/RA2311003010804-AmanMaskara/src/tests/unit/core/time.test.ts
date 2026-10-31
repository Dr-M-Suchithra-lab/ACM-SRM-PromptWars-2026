import { describe, expect, it } from "vitest";
import {
  getISTDay,
  getISTWeekBucket,
  getISTWeekStart,
  getShiftMinutes,
  isNightShift,
  splitShiftByDay,
  toIST,
} from "@/core/time";
import { ist } from "../helpers";

describe("IST day and week bucketing", () => {
  it("uses the IST calendar day, not UTC", () => {
    // 20:00 UTC on Oct 5 is 01:30 IST on Oct 6
    expect(getISTDay(new Date("2026-10-05T20:00:00Z"))).toBe("2026-10-06");
    expect(toIST(new Date("2026-10-05T20:00:00Z")).getUTCHours()).toBe(1);
  });

  it("starts weeks on Monday", () => {
    expect(getISTWeekStart(new Date("2026-10-07T10:00:00+05:30"))).toBe("2026-10-05");
    expect(getISTWeekStart(new Date("2026-10-11T10:00:00+05:30"))).toBe("2026-10-05"); // Sunday
  });

  it("returns ISO week buckets, including across a year boundary", () => {
    expect(getISTWeekBucket(new Date("2026-10-05T10:00:00+05:30"))).toBe("2026-W41");
    expect(getISTWeekBucket(new Date("2026-10-11T23:00:00+05:30"))).toBe("2026-W41");
    expect(getISTWeekBucket(new Date("2026-01-01T10:00:00+05:30"))).toBe("2026-W01");
    // Jan 1 2027 is a Friday → still ISO week 53 of 2026
    expect(getISTWeekBucket(new Date("2027-01-01T10:00:00+05:30"))).toBe("2026-W53");
  });
});

describe("splitShiftByDay", () => {
  it("keeps a day shift on one day", () => {
    expect(splitShiftByDay(ist("2026-10-05", "08:00", "16:30"))).toEqual([{ day: "2026-10-05", minutes: 510 }]);
  });

  it("splits a night shift at IST midnight", () => {
    expect(splitShiftByDay(ist("2026-10-05", "22:00", "06:00", true))).toEqual([
      { day: "2026-10-05", minutes: 120 },
      { day: "2026-10-06", minutes: 360 },
    ]);
  });

  it("returns nothing for an empty or inverted shift", () => {
    expect(splitShiftByDay(ist("2026-10-05", "08:00", "08:00"))).toEqual([]);
    expect(splitShiftByDay(ist("2026-10-05", "10:00", "08:00"))).toEqual([]);
  });
});

describe("isNightShift and getShiftMinutes", () => {
  it("flags shifts overlapping 22:00–06:00 IST", () => {
    expect(isNightShift(ist("2026-10-05", "22:00", "06:00", true))).toBe(true);
    expect(isNightShift(ist("2026-10-05", "04:00", "09:00"))).toBe(true);
    expect(isNightShift(ist("2026-10-05", "08:00", "16:00"))).toBe(false);
    expect(isNightShift(ist("2026-10-05", "10:00", "08:00"))).toBe(false);
  });

  it("counts shift minutes", () => {
    expect(getShiftMinutes(ist("2026-10-05", "08:00", "17:15"))).toBe(555);
  });
});
