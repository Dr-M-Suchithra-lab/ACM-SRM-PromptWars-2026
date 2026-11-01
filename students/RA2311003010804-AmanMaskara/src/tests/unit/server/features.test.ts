import { beforeEach, describe, expect, it } from "vitest";
import { getRepos } from "@/server/repos";
import { resetMemoryStore } from "@/server/repos/memory";
import { payArrears, payCheckFor, importPaidCsv, PAID_CSV_HEADER, savePaidRecord } from "@/server/services/pay-check";
import { requestPayReview, updateDispute } from "@/server/services/disputes";
import { buildPayslip } from "@/server/services/payslip";
import { earnedFor } from "@/server/services/earned";
import { benefitsFor, certificateCandidates, decideCertificate, requestCertificate } from "@/server/services/benefits";
import { issuesForAdmin, issuesForWorker, raiseIssue, signIssue, signerKey } from "@/server/services/issues";
import {
  confirmFix,
  duplicateFor,
  mergeHazards,
  reportHazard,
  sweepHazards,
  unmergeHazard,
} from "@/server/services/hazards";
import { passportData } from "@/server/services/passport";
import { buildOrgSnapshot, onDutyCount } from "@/server/services/workforce";
import {
  addSkillByAdmin,
  addSkillByWorker,
  decideSkill,
  MAX_PENDING_SKILLS,
  pendingSkills,
} from "@/server/services/skills";
import { verifiedTotals } from "@/core/work-history";
import { minutesByDay } from "@/core/overtime";
import { monthKey, payFocusMonth } from "@/core/period";
import type { ClosedShift } from "@/core/types";
import { REDACTED } from "@/ai/redact";
import { RAMESH_UNPAID_OT_MINUTES } from "@/server/seed/data";
import { RAMESH_VERIFIED_DAYS } from "@/server/seed/attendance";

const SECRET = "test-secret";
const now = new Date();

beforeEach(() => resetMemoryStore());

describe("seed stories (relative to today)", () => {
  it("has no empty working day in the last two weeks at either employer", async () => {
    for (const orgId of ["org1", "org2"]) {
      const snapshot = await buildOrgSnapshot(getRepos(), orgId, now);
      const pastWeekdays = snapshot!.attendanceByDay
        .slice(0, -1)
        .filter((d) => new Date(`${d.day}T12:00:00+05:30`).getUTCDay() !== 0);
      for (const day of pastWeekdays) expect(day.present, `${orgId} ${day.day}`).toBeGreaterThan(5);
    }
  });

  it("gives Ramesh 72 verified days for the BOCW progress ring", async () => {
    const view = await benefitsFor(getRepos(), "w1001", now);
    expect(view!.results.find((r) => r.schemeId === "bocw")!.progress).toEqual({
      done: RAMESH_VERIFIED_DAYS,
      needed: 90,
    });
  });

  it("spreads individual quit-risk instead of giving everyone the same site score", async () => {
    const snapshot = await buildOrgSnapshot(getRepos(), "org1", now);
    const scores = snapshot!.workers.map((w) => w.risk.score);
    expect(Math.max(...scores) - Math.min(...scores)).toBeGreaterThan(20);
    expect(snapshot!.workers.every((w) => w.risk.reasons.every((r) => !["mood", "hazards"].includes(r.factor)))).toBe(
      true,
    );
  });
});

describe("FairPay Sentinel", () => {
  it("finds Ramesh's unpaid overtime in the month pay screens open on (4h 32m at ₹200/h ≈ ₹907)", async () => {
    const check = await payCheckFor(getRepos(), "w1001", payFocusMonth(now));
    const finding = check!.result.findings.find((f) => f.code === "OVERTIME_UNDERPAID");
    expect(finding?.explanation.missingMinutes).toBe(RAMESH_UNPAID_OT_MINUTES);
    expect(finding?.difference).toBe(Math.round((RAMESH_UNPAID_OT_MINUTES * 20_000) / 60));
  });

  it("reports no record (not a shortfall) when the employer has not entered pay yet", async () => {
    const check = await payCheckFor(getRepos(), "w1005", monthKey(now));
    expect(check!.result.status).toBe("no_record");
  });

  it("lets the worker request a review once, and the employer must explain the resolution", async () => {
    const repos = getRepos();
    const month = payFocusMonth(now);
    const first = await requestPayReview(repos, { workerId: "w1001", orgId: "org1", month, now });
    expect(first.ok).toBe(true);
    expect(await requestPayReview(repos, { workerId: "w1001", orgId: "org1", month, now })).toEqual({
      ok: false,
      error: "already_open",
    });
    if (!first.ok) return;
    const id = first.dispute.id;
    expect(await updateDispute(repos, { id, orgId: "org2", status: "reviewing", now })).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(await updateDispute(repos, { id, orgId: "org1", status: "resolved", now })).toEqual({
      ok: false,
      error: "note_required",
    });
    expect(await updateDispute(repos, { id, orgId: "org1", status: "reviewing", now })).toEqual({ ok: true });
    expect(await updateDispute(repos, { id, orgId: "org1", status: "resolved", note: "Balance paid", now })).toEqual({
      ok: true,
    });
  });

  it("refuses a review when nothing is short", async () => {
    expect(
      await requestPayReview(getRepos(), {
        workerId: "w1005",
        orgId: "org1",
        // The month before the story month, when everyone but Arun and Lakshmi was paid right.
        month: monthKey(now, payFocusMonth(now) === monthKey(now) ? -1 : -2),
        now,
      }),
    ).toEqual({
      ok: false,
      error: "no_shortfall",
    });
  });

  it("imports a paid-records CSV row by row and reports bad rows", async () => {
    const month = monthKey(now);
    const csv = [
      PAID_CSV_HEADER.join(","),
      `1005,${month},150,4,"12,000.00",1000,11000`,
      `9999,${month},1,1,1,1,1`,
      `1006,${month},x,1,1,1,1`,
    ].join("\n");
    const result = await importPaidCsv(getRepos(), "org1", "admin1", csv, now);
    expect(result).toEqual({
      saved: 1,
      errors: [
        { row: 2, reason: "unknown_worker" },
        { row: 3, reason: "invalid" },
      ],
    });
    expect((await getRepos().paidRecords.get("w1005", month))?.grossPaid).toBe(1_200_000);
    expect(await importPaidCsv(getRepos(), "org1", "admin1", "wrong,header\n1,2", now)).toEqual({
      saved: 0,
      errors: [{ row: 0, reason: "columns" }],
    });
  });
});

describe("earned so far", () => {
  it("equals the payslip gross for the same month", async () => {
    const earned = await earnedFor(getRepos(), "w1001", now);
    const payslip = await buildPayslip(getRepos(), "w1001", monthKey(now));
    expect(earned!.monthGross).toBe(payslip!.payslip.gross);
  });
});

describe("co-signed issues", () => {
  const base = { workerId: "w1002", orgId: "org1", siteId: "site1", now, secret: SECRET };

  it("scrubs names and phone numbers, and counts the creator as the first signer without storing who", async () => {
    const issue = await raiseIssue(getRepos(), { ...base, text: "Ramesh Kumar was shouted at, call 9876543210" });
    expect(issue.text).not.toContain("Ramesh");
    expect(issue.text).not.toContain("9876543210");
    expect(issue.text).toContain(REDACTED);
    expect(issue.signerCount).toBe(1);
    expect(JSON.stringify(issue)).not.toContain("w1002");
    expect(await getRepos().issueSigners.has(signerKey(SECRET, "w1002", issue.id))).toBe(true);
  });

  it("blocks double signing and shows the worker their own signature", async () => {
    const issue = await raiseIssue(getRepos(), { ...base, text: "Lunch break is too short on site" });
    expect(await signIssue(getRepos(), { ...base, issueId: issue.id })).toEqual({ ok: false, error: "already_signed" });
    const mine = (await issuesForWorker(getRepos(), "site1", "w1002", SECRET)).find((i) => i.id === issue.id);
    expect(mine).toMatchObject({ signed: true, needed: 4 });
  });

  it("stays invisible to management until the 5th signature, then escalates", async () => {
    const repos = getRepos();
    const issue = await raiseIssue(repos, { ...base, text: "Night lights on floor 7 are broken" });
    for (const workerId of ["w1003", "w1004", "w1005"])
      await signIssue(repos, { ...base, workerId, issueId: issue.id });
    expect((await issuesForAdmin(repos, "org1")).some((i) => i.id === issue.id)).toBe(false);
    const fifth = await signIssue(repos, { ...base, workerId: "w1006", issueId: issue.id });
    expect(fifth).toEqual({ ok: true, escalated: true });
    expect((await issuesForAdmin(repos, "org1")).find((i) => i.id === issue.id)?.status).toBe("escalated");
  });
});

describe("hazard reports", () => {
  const report = {
    workerId: "w1003",
    orgId: "org1",
    siteId: "site1",
    category: "scaffolding" as const,
    location: "floor 3",
    hideName: true,
    attach: "auto" as const,
    now,
    secret: SECRET,
  };

  it("joins a duplicate report instead of creating a new card, without revealing who reported", async () => {
    const repos = getRepos();
    expect(await duplicateFor(repos, { ...report })).toEqual({ reportCount: 2 });
    const result = await reportHazard(repos, report);
    expect(result).toMatchObject({ hazardId: "haz-c2", merged: true });
    expect(result.trackingRef).toMatch(/^FS-[A-Z0-9]{6}$/);
    const hazard = await repos.hazards.getById("haz-c2");
    expect(hazard!.reports).toHaveLength(3);
    expect(hazard!.severity).toBe("critical"); // 3rd report bumps high → critical
    expect(JSON.stringify(hazard)).not.toContain(result.trackingRef!);
  });

  it("creates a new report when the worker says it is a different problem", async () => {
    const result = await reportHazard(getRepos(), { ...report, attach: "new" });
    expect(result.merged).toBe(false);
  });

  it("lets only the reporter (or the private reference) confirm a fix", async () => {
    const repos = getRepos();
    const input = {
      orgId: "org1",
      hazardId: "haz-c3",
      fixed: false,
      now,
      secret: SECRET,
      trackingRefs: [] as string[],
    };
    expect(await confirmFix(repos, { ...input, workerId: "w1009" })).toEqual({ ok: false, error: "forbidden" });
    expect(await confirmFix(repos, { ...input, workerId: "w1001" })).toEqual({ ok: true });
    expect((await repos.hazards.getById("haz-c3"))?.status).toBe("received");

    const anonymous = await reportHazard(repos, {
      ...report,
      category: "heat_stress",
      location: "roof",
      attach: "new",
    });
    await repos.hazards.update(anonymous.hazardId, { status: "fixed", confirmation: "pending" });
    const viaRef = await confirmFix(repos, {
      ...input,
      hazardId: anonymous.hazardId,
      workerId: "w1009",
      trackingRefs: ["FS-WRONG1", anonymous.trackingRef!],
      fixed: true,
    });
    expect(viaRef).toEqual({ ok: true });
  });

  it("escalates the overdue 'Danger now' report when hazards are viewed", async () => {
    const later = new Date(now.getTime() + 2 * 60 * 60 * 1000); // seeded at 7h old, 4h deadline
    const swept = await sweepHazards(getRepos(), "org1", later);
    expect(swept.find((h) => h.id === "haz-c1")?.escalationLevel).toBe(2);
  });

  it("never merges two different dangers (heat into scaffolding)", async () => {
    const repos = getRepos();
    expect(
      await mergeHazards(repos, { orgId: "org1", sourceId: "haz-c4", targetId: "haz-c2", adminId: "admin1", now }),
    ).toEqual({ ok: false, error: "invalid_transition" });
    expect((await repos.hazards.getById("haz-c4"))!.mergedInto).toBeUndefined();
  });

  it("merges and unmerges the same danger by hand", async () => {
    const repos = getRepos();
    const extra = await reportHazard(repos, { ...report, location: "Gate 2", attach: "new" });
    expect(
      await mergeHazards(repos, {
        orgId: "org1",
        sourceId: extra.hazardId,
        targetId: "haz-c2",
        adminId: "admin1",
        now,
      }),
    ).toEqual({ ok: true });
    expect((await repos.hazards.getById("haz-c2"))!.reports).toHaveLength(3);
    expect((await repos.hazards.getById(extra.hazardId))!.mergedInto).toBe("haz-c2");
    expect(await unmergeHazard(repos, { orgId: "org1", sourceId: extra.hazardId, adminId: "admin1", now })).toEqual({
      ok: true,
    });
    expect((await repos.hazards.getById("haz-c2"))!.reports).toHaveLength(2);
    expect((await repos.hazards.getById(extra.hazardId))!.mergedInto).toBeUndefined();
  });

  it("records a fire as critical, even when the AI hint said low", async () => {
    const repos = getRepos();
    const fire = await reportHazard(repos, { ...report, category: "fire", severityHint: "low", attach: "new" });
    expect((await repos.hazards.getById(fire.hazardId))!.severity).toBe("critical");
    const words = await reportHazard(repos, {
      ...report,
      category: "machinery",
      severityHint: "low",
      transcript: "मशीन के पास आग लगी है",
      attach: "new",
    });
    expect((await repos.hazards.getById(words.hazardId))!.severity).toBe("critical");
  });
});

describe("benefits and work certificates", () => {
  it("lists workers who are eligible or close, and approves a requested certificate", async () => {
    const repos = getRepos();
    const rows = await certificateCandidates(repos, "org1", now);
    expect(rows[0].request?.status).toBe("requested");
    expect(rows.some((r) => r.worker.id === "w1001")).toBe(true); // 72/90 is "close"
    expect(
      await decideCertificate(repos, { id: "cert-1", orgId: "org1", adminId: "admin1", approve: true, now }),
    ).toEqual({ ok: true });
    expect(
      await decideCertificate(repos, { id: "cert-1", orgId: "org1", adminId: "admin1", approve: true, now }),
    ).toEqual({ ok: false, error: "not_pending" });
  });

  it("does not let a worker short of the days request a certificate", async () => {
    expect(await requestCertificate(getRepos(), { workerId: "w1001", schemeId: "bocw", now })).toEqual({
      ok: false,
      error: "not_eligible",
    });
  });
});

describe("skill passport work history", () => {
  it("totals match Ramesh's attendance and self-reported work is labelled", async () => {
    const data = await passportData(getRepos(), "w1001");
    const shifts = (await getRepos().shifts.getByWorker("w1001")).filter((s): s is ClosedShift => Boolean(s.outAt));
    const byDay = minutesByDay(shifts);
    expect(verifiedTotals(data!.history)).toEqual({
      days: byDay.size,
      minutes: [...byDay.values()].reduce((a, b) => a + b, 0),
    });
    expect(data!.history.map((h) => h.source)).toEqual(["verified_employer", "self_reported"]);
  });
});

describe("paying the gap", () => {
  it("clears the worker's shortfall and resolves their review", async () => {
    const repos = getRepos();
    const month = payFocusMonth(now);
    const before = await payCheckFor(repos, "w1001", month);
    expect(before!.outstanding).toBeGreaterThan(0);
    expect((await requestPayReview(repos, { workerId: "w1001", orgId: "org1", month, now })).ok).toBe(true);

    expect(await payArrears(repos, { orgId: "org1", adminId: "admin1", workerId: "w1001", month, now })).toEqual({
      ok: true,
      amount: before!.outstanding,
    });
    const after = await payCheckFor(repos, "w1001", month);
    expect(after).toMatchObject({ outstanding: 0, arrearsPaid: before!.outstanding });
    const dispute = (await repos.payDisputes.getByWorker("w1001")).find((d) => d.month === month);
    expect(dispute).toMatchObject({ status: "resolved", settledAmount: before!.outstanding });

    // Nothing left to pay, nothing left to dispute.
    expect(await payArrears(repos, { orgId: "org1", adminId: "admin1", workerId: "w1001", month, now })).toEqual({
      ok: false,
      error: "nothing_owed",
    });
    expect(await requestPayReview(repos, { workerId: "w1001", orgId: "org1", month, now })).toEqual({
      ok: false,
      error: "no_shortfall",
    });
  });

  it("keeps arrears when the pay record is corrected, and refuses other organisations", async () => {
    const repos = getRepos();
    const month = payFocusMonth(now);
    await payArrears(repos, { orgId: "org1", adminId: "admin1", workerId: "w1001", month, now });
    const record = (await repos.paidRecords.get("w1001", month))!;
    await savePaidRecord(repos, "org1", "admin1", { ...record, workerId: "w1001", month }, now);
    expect((await repos.paidRecords.get("w1001", month))!.arrears).toHaveLength(1);
    expect(await payArrears(repos, { orgId: "org2", adminId: "admin2", workerId: "w1001", month, now })).toEqual({
      ok: false,
      error: "not_found",
    });
  });
});

describe("skills", () => {
  const input = { title: "Bar bending", issuer: "ITI Pune", date: "2025-01-15" };

  it("a worker's skill waits for the employer; verifying puts it on the passport", async () => {
    const repos = getRepos();
    expect(await addSkillByWorker(repos, "w1001", input, now)).toEqual({ ok: true });
    const queued = (await pendingSkills(repos, "org1")).find((p) => p.skill.title === "Bar bending")!;
    expect(queued.worker.id).toBe("w1001");
    expect(
      await decideSkill(repos, { id: queued.skill.id, orgId: "org2", adminId: "admin2", verify: true, now }),
    ).toEqual({ ok: false, error: "not_found" });
    expect(
      await decideSkill(repos, { id: queued.skill.id, orgId: "org1", adminId: "admin1", verify: true, now }),
    ).toEqual({ ok: true });
    expect(
      await decideSkill(repos, { id: queued.skill.id, orgId: "org1", adminId: "admin1", verify: false, now }),
    ).toEqual({ ok: false, error: "not_pending" });
    const passport = await passportData(repos, "w1001");
    expect(passport!.skills.find((s) => s.title === "Bar bending")?.verifiedBy).toBe("admin1");
  });

  it("a rejected skill stays unverified; an admin's own entry is verified at once", async () => {
    const repos = getRepos();
    await addSkillByWorker(repos, "w1002", input, now);
    const queued = (await pendingSkills(repos, "org1")).find((p) => p.worker.id === "w1002")!;
    await decideSkill(repos, { id: queued.skill.id, orgId: "org1", adminId: "admin1", verify: false, now });
    expect(await repos.skills.getById(queued.skill.id)).toMatchObject({ rejected: true });
    expect((await repos.skills.getById(queued.skill.id))!.verifiedBy).toBeUndefined();
    expect(
      await addSkillByAdmin(repos, {
        ...input,
        title: "Rigging",
        workerId: "w1002",
        orgId: "org1",
        adminId: "admin1",
        now,
      }),
    ).toEqual({ ok: true });
    expect((await repos.skills.getByWorker("w1002")).find((s) => s.title === "Rigging")).toMatchObject({
      verifiedBy: "admin1",
      addedBy: "admin",
    });
    expect(
      await addSkillByAdmin(repos, { ...input, workerId: "w1002", orgId: "org2", adminId: "admin2", now }),
    ).toEqual({ ok: false, error: "not_found" });
  });

  it("limits how many skills can wait at once", async () => {
    const repos = getRepos();
    for (let i = 0; i < MAX_PENDING_SKILLS; i++)
      await addSkillByWorker(repos, "w1005", { ...input, title: `Skill ${i}` }, now);
    expect(await addSkillByWorker(repos, "w1005", input, now)).toEqual({ ok: false, error: "too_many" });
  });
});

describe("on duty now", () => {
  it("counts workers with an open shift out of the whole roll", async () => {
    const snapshot = await buildOrgSnapshot(getRepos(), "org1", now);
    expect(await onDutyCount(getRepos(), "org1")).toEqual({
      onDuty: snapshot!.workers.filter((w) => w.onSite).length,
      total: snapshot!.workers.length,
    });
  });
});
