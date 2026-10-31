import { beforeEach, describe, expect, it } from "vitest";
import { getRepos } from "@/server/repos";
import { resetMemoryStore } from "@/server/repos/memory";
import { hasAnsweredThisWeek, submitFeedback } from "@/server/services/feedback";
import { buildPayslip } from "@/server/services/payslip";
import { monthKey } from "@/core/period";

const NOW = new Date("2026-10-27T10:00:00+05:30");
const base = {
  workerId: "w1001",
  orgId: "org1",
  siteId: "site1",
  scores: { pay: 1, safety: 2, respect: 3 },
  now: NOW,
  hmacSecret: "test-secret",
};

describe("anonymous feedback", () => {
  beforeEach(() => resetMemoryStore());

  it("stores answers without any worker identity", async () => {
    const before = (await getRepos().feedback.getAll()).length;
    expect(await submitFeedback(getRepos(), base)).toEqual({ ok: true });
    const all = await getRepos().feedback.getAll();
    expect(all).toHaveLength(before + 1);
    const stored = all[all.length - 1];
    expect(JSON.stringify(stored)).not.toContain("w1001");
    expect(stored.cohort).toBe("site1:all");
    expect(stored.createdAt.toISOString()).toMatch(/T00:00:00.000Z$/); // day precision only
  });

  it("allows one answer per worker per week", async () => {
    await submitFeedback(getRepos(), base);
    expect(await submitFeedback(getRepos(), base)).toEqual({ ok: false, error: "already_answered" });
    expect(await hasAnsweredThisWeek(getRepos(), "w1001", NOW, "test-secret")).toBe(true);
    expect(await hasAnsweredThisWeek(getRepos(), "w1002", NOW, "test-secret")).toBe(false);
    const nextWeek = new Date(NOW.getTime() + 7 * 86_400_000);
    expect(await submitFeedback(getRepos(), { ...base, now: nextWeek })).toEqual({ ok: true });
  });

  it("redacts names and phone numbers from comments", async () => {
    await submitFeedback(getRepos(), { ...base, comment: "Ramesh and Priya Menon shouted. Call 9876543210" });
    const stored = (await getRepos().feedback.getAll()).at(-1)!;
    expect(stored.comment).not.toMatch(/Ramesh|Priya|Menon|9876543210/);
  });
});

describe("payslip service", () => {
  beforeEach(() => resetMemoryStore());

  it("builds the current month payslip with PF on regular pay only", async () => {
    const view = await buildPayslip(getRepos(), "w1001", monthKey(new Date()));
    expect(view).not.toBeNull();
    const { payslip } = view!;
    const regular = payslip.lines.find((l) => l.kind === "regular")!.amount;
    expect(payslip.deductions[0]).toMatchObject({ label: "pf", amount: Math.round(regular * 0.12) });
    expect(payslip.net).toBe(payslip.gross - payslip.deductions[0].amount);
  });

  it("returns null for an unknown worker", async () => {
    expect(await buildPayslip(getRepos(), "nobody", "2026-10")).toBeNull();
  });
});
