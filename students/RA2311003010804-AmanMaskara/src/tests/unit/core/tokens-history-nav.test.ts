import { describe, expect, it } from "vitest";
import { signToken, toUnixSeconds, verifyToken } from "@/core/signed-token";
import { buildWorkHistory, sharedSections, verifiedTotals, type SiteInfo } from "@/core/work-history";
import { backTarget, logicalParent, MAX_STACK, navDirection, recordVisit } from "@/core/nav-stack";
import { minutesByDay } from "@/core/overtime";
import { dayShifts, ist } from "../helpers";

const SECRET = "test-secret";
const now = new Date("2026-10-30T10:00:00Z");
const DAY_S = 86_400;

describe("signed tokens", () => {
  const claims = { kind: "passport", sub: "w1001", iat: toUnixSeconds(now), exp: toUnixSeconds(now) + 30 * DAY_S };

  it("round-trips valid claims", () => {
    expect(verifyToken(signToken(claims, SECRET), SECRET, "passport", now)).toEqual({ ok: true, claims });
  });

  it("rejects an expired token", () => {
    const later = new Date(now.getTime() + 31 * DAY_S * 1000);
    expect(verifyToken(signToken(claims, SECRET), SECRET, "passport", later)).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects a tampered token (changed worker, or signed with another secret)", () => {
    const [, sig] = signToken(claims, SECRET).split(".");
    const forged = `${Buffer.from(JSON.stringify({ ...claims, sub: "w2001" })).toString("base64url")}.${sig}`;
    expect(verifyToken(forged, SECRET, "passport", now)).toEqual({ ok: false, reason: "tampered" });
    expect(verifyToken(signToken(claims, "other"), SECRET, "passport", now)).toEqual({ ok: false, reason: "tampered" });
  });

  it("never accepts one kind of token as another", () => {
    expect(verifyToken(signToken(claims, SECRET), SECRET, "certificate", now).ok).toBe(false);
  });

  it("rejects garbage", () => {
    for (const token of ["", "abc", "a.b.c", "%%%.###"])
      expect(verifyToken(token, SECRET, "passport", now).ok).toBe(false);
  });
});

describe("work history", () => {
  const sites = new Map<string, SiteInfo>([
    ["site1", { name: "Velachery Tower", employer: "BuildRight", sector: "construction" }],
    ["site9", { name: "Old Market Mall", employer: "Shakti Infra", sector: "construction" }],
  ]);
  const atSite = (siteId: string, shifts: ReturnType<typeof dayShifts>) => shifts.map((s) => ({ ...s, siteId }));
  const shifts = [
    ...atSite("site9", dayShifts("2026-06-01", 10, 8)),
    ...atSite("site1", dayShifts("2026-09-01", 25, 9)),
    ist("2026-10-01", "22:00", "06:00", true),
  ];

  it("has one verified entry per employer site, newest first, with date range", () => {
    const history = buildWorkHistory(shifts, sites, "Mason");
    expect(history.map((h) => [h.site, h.from, h.to, h.source])).toEqual([
      ["Velachery Tower", "2026-09-01", "2026-10-02", "verified_employer"],
      ["Old Market Mall", "2026-06-01", "2026-06-10", "verified_employer"],
    ]);
  });

  it("totals match the attendance records exactly", () => {
    const totals = verifiedTotals(buildWorkHistory(shifts, sites, "Mason"));
    const byDay = minutesByDay(shifts);
    expect(totals).toEqual({ days: byDay.size, minutes: [...byDay.values()].reduce((a, b) => a + b, 0) });
  });

  it("never counts self-reported work in the verified totals", () => {
    const history = buildWorkHistory(shifts, sites, "Mason");
    const selfReported = { ...history[0], source: "self_reported" as const, days: 400, minutes: 999_999 };
    expect(verifiedTotals([...history, selfReported])).toEqual(verifiedTotals(history));
  });

  it("share toggles hide exactly the sections the worker switched off", () => {
    const history = buildWorkHistory(shifts, sites, "Mason");
    const skills = ["Scaffolding safety"];
    expect(sharedSections(skills, history, { skills: true, history: false, hours: false })).toEqual({
      skills,
      history: undefined,
      totals: undefined,
    });
    const noHours = sharedSections(skills, history, { skills: false, history: true, hours: false });
    expect(noHours.skills).toBeUndefined();
    expect(noHours.totals).toBeUndefined();
    expect(noHours.history?.every((e) => e.minutes === 0)).toBe(true);
    expect(sharedSections(skills, history, { skills: true, history: true, hours: true }).totals?.days).toBeGreaterThan(
      0,
    );
  });
});

describe("navigation stack", () => {
  it("Home → Pay → Report → Me, then back steps Me → Report → Pay → Home", () => {
    let stack: string[] = [];
    for (const page of ["/w", "/w/pay", "/w/report", "/w/skills"]) stack = recordVisit(stack, page);
    const visited: string[] = [];
    let current = "/w/skills";
    for (let i = 0; i < 3; i++) {
      const target = backTarget(stack, current);
      expect(target?.kind).toBe("history");
      current = target!.path;
      visited.push(current);
      stack = recordVisit(stack, current);
    }
    expect(visited).toEqual(["/w/report", "/w/pay", "/w"]);
    expect(backTarget(stack, "/w")).toBeNull();
  });

  it("ignores repeat visits to the same page (month tabs, refreshes)", () => {
    expect(recordVisit(recordVisit(["/w"], "/w/pay"), "/w/pay")).toEqual(["/w", "/w/pay"]);
  });

  it("falls back to the logical parent when the page was opened directly", () => {
    expect(backTarget([], "/w/report/haz-1")).toEqual({ kind: "parent", path: "/w/report" });
    expect(backTarget(["/w/pay"], "/w/pay")).toEqual({ kind: "parent", path: "/w" });
    expect(logicalParent("/a/hazards")).toBe("/a");
    expect(logicalParent("/passport")).toBe("/");
  });

  it("caps the stack size", () => {
    let stack: string[] = [];
    for (let i = 0; i < MAX_STACK + 10; i++) stack = recordVisit(stack, `/w/report/h${i}`);
    expect(stack).toHaveLength(MAX_STACK);
  });
});

describe("navDirection (Mac-style slide direction)", () => {
  it.each([
    ["/w", "/w/pay", "forward"],
    ["/w/skills", "/w/report", "back"],
    ["/w/report", "/w/report/haz-1", "forward"],
    ["/w/report/haz-1", "/w/report", "back"],
    ["/w/report/haz-1", "/w/pay", "back"],
    ["/a", "/a/payroll", "forward"],
    ["/a/kiosk", "/a/hazards", "back"],
  ] as const)("%s → %s slides %s", (from, to, direction) => {
    expect(navDirection(from, to)).toBe(direction);
  });
});
