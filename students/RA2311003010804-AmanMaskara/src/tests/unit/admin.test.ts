import { beforeEach, describe, expect, it } from "vitest";
import { canTransition, nextStatuses } from "@/core/hazard-rules";
import { csvCell, paiseToRupees, toCsv } from "@/core/csv";
import { countThemes, tagThemes } from "@/core/themes";
import { getRepos } from "@/server/repos";
import { resetMemoryStore } from "@/server/repos/memory";
import { buildOrgSnapshot, countMissedDays, recentDays } from "@/server/services/workforce";
import { buildPayroll } from "@/server/services/payroll";
import { monthKey } from "@/core/period";
import { templateBrief, weeklyBrief } from "@/ai/brief";
import { dayShifts } from "./helpers";

describe("hazard status transitions", () => {
  it("allows the normal flow; only a reporter's 'not fixed' reopens a fixed hazard", () => {
    expect(nextStatuses("received")).toEqual(["in_progress", "fixed", "dismissed"]);
    expect(canTransition("in_progress", "fixed")).toBe(true);
    expect(canTransition("fixed", "received")).toBe(true);
    expect(canTransition("fixed", "dismissed")).toBe(false);
    expect(canTransition("dismissed", "received")).toBe(true);
    expect(canTransition("in_progress", "received")).toBe(false);
  });
});

describe("CSV export", () => {
  it("quotes commas and quotes, and neutralises formula injection", () => {
    expect(csvCell("Kumar, Ramesh")).toBe('"Kumar, Ramesh"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell("+91")).toBe('"\'+91"');
    expect(csvCell(42)).toBe("42");
    expect(csvCell(-5)).toBe("-5"); // negative numbers stay numbers
  });

  it("builds CRLF rows and formats paise", () => {
    expect(
      toCsv([
        ["a", 1],
        ["b", 2],
      ]),
    ).toBe("a,1\r\nb,2\r\n");
    expect(paiseToRupees(123456)).toBe("1234.56");
  });
});

describe("feedback themes", () => {
  it("tags multilingual comments", () => {
    expect(tagThemes("Overtime not paid, salary late")).toEqual(["pay", "hours"]);
    expect(tagThemes("पानी नहीं है")).toEqual(["facilities"]);
    expect(tagThemes("மேற்பார்வையாளர் திட்டுகிறார்")).toEqual(["respect"]);
    expect(countThemes(["unsafe helmet", "no water", "danger"])).toMatchObject({ safety: 2, facilities: 1, pay: 0 });
  });
});

describe("workforce snapshot", () => {
  beforeEach(() => resetMemoryStore());

  it("lists 14 IST days ending today", () => {
    const days = recentDays(new Date("2026-10-27T10:00:00+05:30"), 14);
    expect(days).toHaveLength(14);
    expect(days.at(-1)).toBe("2026-10-27");
    expect(days[0]).toBe("2026-10-14");
  });

  it("counts missed working days, allowing one rest day a week, never today or days before joining", () => {
    const now = new Date("2026-10-17T10:00:00+05:30"); // Saturday
    // Joined Mon 12th, worked Mon–Wed: of the 5 days to Friday, 4 were due (one rest day) → 1 missed.
    const joined = new Date("2026-10-12T00:00:00+05:30");
    expect(countMissedDays(dayShifts("2026-10-12", 3, 8), now, joined)).toBe(1);
    // A full fortnight of 6-day weeks is never "missed", whichever day the rest falls on.
    const longAgo = new Date("2026-09-01T00:00:00+05:30");
    const rotating = [...dayShifts("2026-10-03", 6, 8), ...dayShifts("2026-10-10", 6, 8)];
    expect(countMissedDays(rotating, now, longAgo)).toBe(0);
  });

  it("computes the dashboard for the construction org from seed data", async () => {
    const snapshot = await buildOrgSnapshot(getRepos(), "org1", new Date());
    expect(snapshot?.workers).toHaveLength(18);
    expect(snapshot?.sites).toHaveLength(1);
    expect(snapshot?.attendanceByDay).toHaveLength(14);
    expect(snapshot?.overtimeByWeek).toHaveLength(4);
    // sorted by risk, highest first
    const scores = snapshot!.workers.map((w) => w.risk.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    // the absent worker (Ravi) has missed days
    expect(snapshot!.workers.find((w) => w.worker.id === "w1006")!.missedDays).toBeGreaterThan(0);
  });

  it("flags Sunita's night-shift fatigue in the hospital org", async () => {
    const snapshot = await buildOrgSnapshot(getRepos(), "org2", new Date());
    const sunita = snapshot!.workers.find((w) => w.worker.id === "w2001")!;
    expect(sunita.fatigue.map((a) => a.ruleId)).toContain("hos-nights-2");
  });

  it("returns null for an unknown org and builds payroll rows", async () => {
    expect(await buildOrgSnapshot(getRepos(), "nope", new Date())).toBeNull();
    const rows = await buildPayroll(getRepos(), "org1", monthKey(new Date()));
    expect(rows).toHaveLength(18);
    for (const r of rows) expect(r.net).toBe(r.gross - r.deductions);
  });
});

describe("weekly brief", () => {
  const input = {
    orgName: "BuildRight",
    sector: "construction",
    workers: 6,
    onSite: 3,
    overtimeHours: 12.5,
    openHazards: 2,
    urgentHazards: 1,
    fatigueBreaches: 1,
    highRiskWorkers: 0,
    moodAverage: 2.2,
    topThemes: ["pay"],
  };

  it("falls back to a deterministic template without a client", async () => {
    const brief = await weeklyBrief(input, null);
    expect(brief.source).toBe("template");
    expect(brief.points).toEqual(templateBrief(input));
    expect(brief.points.join(" ")).toContain("12.5h");
  });

  it("uses Gemini output when valid, template when not", async () => {
    const synthesizeSpeech = async () => null;
    const good = { generateText: async () => JSON.stringify({ points: ["One.", "Two."] }), synthesizeSpeech };
    expect((await weeklyBrief(input, good)).source).toBe("gemini");
    const bad = { generateText: async () => "nope", synthesizeSpeech };
    expect((await weeklyBrief(input, bad)).source).toBe("template");
  });
});
