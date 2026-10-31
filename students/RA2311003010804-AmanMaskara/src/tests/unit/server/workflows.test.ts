import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRepos } from "@/server/repos";
import { resetMemoryStore } from "@/server/repos/memory";
import { findingSentences, payTemplate } from "@/server/pay-explain";
import { buildPayslip } from "@/server/services/payslip";
import { certificateCandidates, requestCertificate } from "@/server/services/benefits";
import { issuesForAdmin, respondToIssue } from "@/server/services/issues";
import { monthKey } from "@/core/period";
import { cn } from "@/lib/utils";

// Real English messages through next-intl's own translator, so wording and placeholders are checked too.
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("next-intl");
  const messages = (await import("@/messages/en.json")).default;
  return {
    getTranslations: async (namespace: string) =>
      createTranslator({ locale: "en", messages, namespace: namespace as never }),
  };
});

beforeEach(() => resetMemoryStore());
const now = new Date();

describe("plain-words pay explanation", () => {
  it("explains the payslip in sentences whose numbers are the payslip's own", async () => {
    const view = (await buildPayslip(getRepos(), "w1001", monthKey(now, -1)))!;
    const { sentences, facts } = await payTemplate(view);
    expect(sentences[0]).toBe(`You worked ${view.daysWorked} days, ${facts.values.hours} in total.`);
    expect(sentences.at(-1)).toBe(`You receive ${facts.values.net}.`);
    expect(sentences.join(" ")).not.toMatch(/[{}]/);
  });

  it("shows the arithmetic behind every kind of shortfall", async () => {
    const sentences = await findingSentences([
      {
        code: "OVERTIME_UNDERPAID",
        expected: 270_667,
        paid: 180_000,
        difference: 90_667,
        explanation: { recordedMinutes: 812, paidMinutes: 540, missingMinutes: 272, rate: 20_000 },
      },
      {
        code: "REGULAR_UNDERPAID",
        expected: 100_000,
        paid: 90_000,
        difference: 10_000,
        explanation: { recordedMinutes: 600, paidMinutes: 540, missingMinutes: 60, rate: 10_000 },
      },
      {
        code: "BELOW_MINIMUM_WAGE",
        expected: 500_000,
        paid: 400_000,
        difference: 100_000,
        explanation: { workedMinutes: 6000 },
      },
      {
        code: "DEDUCTION_MISMATCH",
        expected: 0,
        paid: 0,
        difference: 30_000,
        explanation: { withheld: 150_000, expectedDeductions: 120_000 },
      },
    ]);
    expect(sentences[0]).toBe("13h 32m overtime recorded, 9h paid → 4h 32m × ₹200/h = ₹907");
    expect(sentences[1]).toMatch(/^10h regular hours recorded, 9h paid → 1h × ₹100\/h = ₹100$/);
    expect(sentences[2]).toMatch(/minimum wage is ₹5,000, but ₹4,000 was paid$/);
    expect(sentences[3]).toBe("₹1,500 was held back, but deductions should be ₹1,200 → ₹300 extra");
  });
});

describe("work certificate request", () => {
  it("records a request for an eligible worker exactly once", async () => {
    const repos = getRepos();
    const eligible = (await certificateCandidates(repos, "org1", now)).find(
      (c) => !c.request && c.progress.done >= c.progress.needed,
    );
    expect(eligible).toBeDefined();
    const input = { workerId: eligible!.worker.id, schemeId: eligible!.schemeId, now };
    expect(await requestCertificate(repos, input)).toEqual({ ok: true });
    expect(await requestCertificate(repos, input)).toEqual({ ok: false, error: "already_requested" });
    const row = (await certificateCandidates(repos, "org1", now)).find(
      (c) => c.worker.id === input.workerId && c.schemeId === input.schemeId,
    );
    // Progress stops at the scheme's target; the certificate certifies every day actually worked.
    expect(row?.request?.status).toBe("requested");
    expect(row!.request!.daysWorked).toBeGreaterThanOrEqual(eligible!.progress.needed);
  });
});

describe("management response to a co-signed issue", () => {
  const respond = (input: Partial<Parameters<typeof respondToIssue>[1]>) =>
    respondToIssue(getRepos(), {
      orgId: "org1",
      issueId: "iss-2",
      status: "acknowledged",
      response: "On it",
      now,
      ...input,
    });

  it("needs a written response, a valid next step and the right organisation", async () => {
    expect(await respond({ response: "   " })).toEqual({ ok: false, error: "response_required" });
    expect(await respond({ orgId: "org2" })).toEqual({ ok: false, error: "not_found" });
    expect(await respond({ issueId: "iss-3" })).toEqual({ ok: false, error: "not_found" }); // still gathering
    expect(await respond({ issueId: "iss-1", status: "acknowledged" })).toEqual({
      ok: false,
      error: "invalid_transition",
    });
  });

  it("records the response the workers will read", async () => {
    expect(await respond({ response: "  Bus list moves to 2 pm  " })).toEqual({ ok: true });
    const issue = (await issuesForAdmin(getRepos(), "org1")).find((i) => i.id === "iss-2");
    expect(issue).toMatchObject({ status: "acknowledged", response: "Bus list moves to 2 pm" });
  });
});

describe("class names", () => {
  it("lets a later theme colour or radius override an earlier one", () => {
    expect(cn("bg-surface p-2", "bg-primary")).toBe("p-2 bg-primary");
    expect(cn("rounded-card", false && "hidden", "rounded-tile")).toBe("rounded-tile");
  });
});
