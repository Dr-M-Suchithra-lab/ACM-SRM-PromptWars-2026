import { beforeEach, describe, expect, it } from "vitest";
import { getRepos } from "@/server/repos";
import { resetMemoryStore } from "@/server/repos/memory";
import { adminHazardAction, confirmFix, mergeHazards, unmergeHazard } from "@/server/services/hazards";
import { addSkillByAdmin, decideSkill, pendingSkills } from "@/server/services/skills";
import { requestPayReview, updateDispute } from "@/server/services/disputes";
import { decideCertificate } from "@/server/services/benefits";
import { payArrears, savePaidRecord } from "@/server/services/pay-check";
import { respondToIssue } from "@/server/services/issues";
import { payFocusMonth } from "@/core/period";

beforeEach(() => resetMemoryStore());

// Every record id below belongs to org1 (construction). The caller is the org2 (hospital) manager,
// who holds a valid session but must not be able to read or change anything outside org2.
const now = new Date();
const outsider = { orgId: "org2", adminId: "admin2", now };
const NOT_FOUND = { ok: false, error: "not_found" };

describe("one organisation can never act on another's records", () => {
  it("hazards: status changes, merges and fix confirmations", async () => {
    const [first, second] = await getRepos().hazards.getByOrg("org1");
    const action = { type: "start" } as const;
    expect(await adminHazardAction(getRepos(), { ...outsider, hazardId: first.id, action })).toEqual(NOT_FOUND);
    expect(await mergeHazards(getRepos(), { ...outsider, sourceId: first.id, targetId: second.id })).toEqual(NOT_FOUND);
    expect(await unmergeHazard(getRepos(), { ...outsider, sourceId: first.id })).toEqual(NOT_FOUND);
    expect(
      await confirmFix(getRepos(), {
        orgId: "org2",
        hazardId: first.id,
        workerId: "w2001",
        trackingRefs: [],
        fixed: true,
        now,
        secret: "s",
      }),
    ).toEqual(NOT_FOUND);
    expect((await getRepos().hazards.getById(first.id))!.status).toBe(first.status);
  });

  it("skills: verifying or adding a skill for another organisation's worker", async () => {
    const [{ skill }] = await pendingSkills(getRepos(), "org1");
    expect(await decideSkill(getRepos(), { ...outsider, id: skill.id, verify: true })).toEqual(NOT_FOUND);
    const added = await addSkillByAdmin(getRepos(), {
      ...outsider,
      workerId: "w1001",
      title: "Forged",
      issuer: "Nobody",
      date: "2026-01-01",
    } as Parameters<typeof addSkillByAdmin>[1]);
    expect(added).toEqual(NOT_FOUND);
    const after = (await getRepos().skills.getById(skill.id))!;
    expect(after.verifiedBy).toBeUndefined();
    expect(after.decidedAt).toBeUndefined();
  });

  it("pay: disputes, recorded payments and arrears", async () => {
    const month = payFocusMonth(now);
    const review = await requestPayReview(getRepos(), { workerId: "w1001", orgId: "org1", month, now });
    expect(review.ok).toBe(true);
    if (!review.ok) return;
    expect(
      await updateDispute(getRepos(), { ...outsider, id: review.dispute.id, status: "resolved", note: "x" }),
    ).toEqual(NOT_FOUND);
    expect(await payArrears(getRepos(), { ...outsider, workerId: "w1001", month })).toEqual(NOT_FOUND);
    const record = {
      workerId: "w1001",
      month,
      paidRegularHours: 0,
      paidOvertimeHours: 0,
      grossPaid: 0,
      deductions: 0,
      netPaid: 0,
    };
    expect(await savePaidRecord(getRepos(), "org2", "admin2", record, now)).toBe(false);
  });

  it("certificates and co-signed issues", async () => {
    expect(await decideCertificate(getRepos(), { ...outsider, id: "cert-1", approve: true })).toEqual(NOT_FOUND);
    expect(
      await respondToIssue(getRepos(), { orgId: "org2", issueId: "iss-2", status: "resolved", response: "x", now }),
    ).toEqual(NOT_FOUND);
  });
});
