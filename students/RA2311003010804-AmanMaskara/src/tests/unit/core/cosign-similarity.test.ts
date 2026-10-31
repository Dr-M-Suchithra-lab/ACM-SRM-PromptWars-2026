import { describe, expect, it } from "vitest";
import { addSignature, canTransitionIssue, signaturesNeeded, visibleToAdmin, type CoSignable } from "@/core/cosign";
import { K_ANONYMITY } from "@/core/anonymity";
import { keywordSimilarity, keywords, rankBySimilarity } from "@/core/similarity";

const issue = (signerCount: number, status: CoSignable["status"] = "gathering") => ({ id: "i1", signerCount, status });

describe("co-signed issues", () => {
  it("uses the same threshold as anonymous feedback", () => {
    expect(signaturesNeeded(issue(1))).toBe(K_ANONYMITY - 1);
  });

  it("blocks a second signature from the same worker", () => {
    expect(addSignature(issue(2), true)).toEqual({ ok: false, error: "already_signed" });
  });

  it("stays hidden at 4 signers and escalates exactly on the 5th", () => {
    const fourth = addSignature(issue(3), false);
    expect(fourth).toMatchObject({ ok: true, escalated: false, issue: { signerCount: 4, status: "gathering" } });
    const fifth = addSignature(issue(4), false);
    expect(fifth).toMatchObject({ ok: true, escalated: true, issue: { signerCount: 5, status: "escalated" } });
    const sixth = addSignature(issue(5, "escalated"), false);
    expect(sixth).toMatchObject({ ok: true, escalated: false, issue: { signerCount: 6, status: "escalated" } });
  });

  it("shows management nothing below the threshold — not even a count", () => {
    const issues = [issue(1), issue(4), { ...issue(5, "escalated"), id: "i2" }, { ...issue(7, "resolved"), id: "i3" }];
    expect(visibleToAdmin(issues).map((i) => i.id)).toEqual(["i2", "i3"]);
    expect(visibleToAdmin([issue(4)])).toEqual([]);
  });

  it("does not accept signatures on resolved issues", () => {
    expect(addSignature(issue(6, "resolved"), false)).toEqual({ ok: false, error: "closed" });
  });

  it("moves escalated → acknowledged → resolved only", () => {
    expect(canTransitionIssue("escalated", "acknowledged")).toBe(true);
    expect(canTransitionIssue("acknowledged", "resolved")).toBe(true);
    expect(canTransitionIssue("gathering", "acknowledged")).toBe(false);
    expect(canTransitionIssue("resolved", "escalated")).toBe(false);
  });
});

describe("keyword similarity", () => {
  it("drops stopwords and keeps Indic words whole", () => {
    expect([...keywords("The water is not clean")]).toEqual(["water", "clean"]);
    expect([...keywords("குடிநீர் இல்லை")]).toEqual(["குடிநீர்"]);
  });

  it("finds an existing issue that says the same thing in other words", () => {
    const existing = [
      { id: "a", text: "No drinking water on floor 5 after lunch" },
      { id: "b", text: "Toilet near gate is broken" },
      { id: "c", text: "Supervisor shouts at helpers" },
    ];
    expect(rankBySimilarity("drinking water missing", existing, (i) => i.text).map((i) => i.id)).toEqual(["a"]);
    expect(rankBySimilarity("salary late again", existing, (i) => i.text)).toEqual([]);
  });

  it("scores identical texts 1 and unrelated texts 0", () => {
    expect(keywordSimilarity("pani nahi hai", "pani nahi hai")).toBe(1);
    expect(keywordSimilarity("helmet", "salary")).toBe(0);
    expect(keywordSimilarity("", "salary")).toBe(0);
  });
});
