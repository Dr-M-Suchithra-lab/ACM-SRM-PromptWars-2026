import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { shiftTimes } from "../src/lib/shift-form";
import { rpcFailure } from "../server/rpc-errors";
describe("reported production repairs", () => {
  it.each([
    ["", "2026-11-02T17:00", 30, "complete start"],
    ["2026-11-02T09:00", "", "30", "complete end"],
    ["2026-11-02T09:00", "2026-11-01T17:00", 30, "later than"],
    ["2026-11-02T09:00", "2026-11-02T10:00", 60, "shorter"],
    ["2026-11-02T09:00", "2026-11-04T10:00", 30, "24 hours"],
  ])("rejects invalid shift entry %s", (s, e, b, message) => {
    expect(() =>
      shiftTimes(String(s), String(e), Number(b), "Asia/Kolkata"),
    ).toThrow(String(message));
  });
  it("preserves local same-day and overnight times at whole-minute boundaries", () => {
    const times = shiftTimes(
      "2026-11-02T22:00",
      "2026-11-03T06:30",
      30,
      "Asia/Kolkata",
    );
    expect(times).toEqual({
      starts_at: "2026-11-02T16:30:00.000Z",
      ends_at: "2026-11-03T01:00:00.000Z",
      break_minutes: 30,
    });
  });
  it.each([
    ["42501", "private employee details", 403],
    ["PGRST202", "private sql", 503],
    ["23505", "private table", 409],
    ["P0001", "Invalid next status or note", 409],
  ])("classifies safe RPC failure %s", (code, message, status) => {
    const failure = rpcFailure("update_safety", {
      code: String(code),
      message: String(message),
    });
    expect(failure.status).toBe(status);
    expect(failure.error).not.toContain("private");
  });
  it("keeps production confirmation callbacks on the current origin", () => {
    const source = readFileSync("src/components/AuthExperience.tsx", "utf8");
    expect(source).toContain("emailRedirectTo:");
    expect(source).toContain("window.location.origin");
    expect(source).not.toMatch(/localhost:3000/);
  });
  it("has no obsolete current product branding or assistant availability badge", () => {
    const walk = (p: string): string[] =>
      readdirSync(p, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(p, e.name)) : [join(p, e.name)],
      );
    for (const path of [...walk("src"), ...walk("server"), "index.html"]) {
      const lines = readFileSync(path, "utf8")
        .split("\n")
        .filter(
          (l) =>
            !l.includes("fairshift-language") &&
            !l.includes("@demo.fairshift.example"),
        );
      expect(lines.join("\n"), path).not.toMatch(
        /fair\s?shift|saakshi|fairshift-saakshi-ai/i,
      );
    }
    const app = readFileSync("src/App.tsx", "utf8");
    expect(app).not.toContain("t.fallback");
    expect(app).not.toContain("t.ai :");
  });
});
