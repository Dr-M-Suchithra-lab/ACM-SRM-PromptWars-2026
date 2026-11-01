/**
 * Deterministic demo data, generated relative to `now` (seeded PRNG, no Math.random()).
 * Bump SEED_VERSION whenever the shape or story changes: MongoDB re-seeds on mismatch.
 */
import { computeDeductions } from "@/core/deductions";
import { minutesByDay } from "@/core/overtime";
import { computePayslip } from "@/core/pay";
import { monthKey, monthRange, payFocusMonth } from "@/core/period";
import { getISTDay } from "@/core/time";
import type { ClosedShift } from "@/core/types";
import type {
  Admin,
  CertificateRequest,
  FeedbackEntry,
  Hazard,
  Org,
  PaidRecordEntry,
  PayDispute,
  PayoutAccount,
  PayoutBatch,
  Shift,
  Site,
  SiteIssue,
  Skill,
  Worker,
} from "../repos/types";
import { buildAdmins, buildWorkers, ORGS, SITES } from "./roster";
import { generateShifts, rameshJoinedAt } from "./attendance";
import { buildFeedback, buildHazards, buildIssues, SKILLS } from "./records";
import { buildPayoutAccounts } from "./payouts";

export const SEED_VERSION = 7;

/** Ramesh was paid for 9h of overtime this month although 13h 32m were recorded. */
export const RAMESH_UNPAID_OT_MINUTES = 4 * 60 + 32;

export interface SeedData {
  orgs: Org[];
  sites: Site[];
  workers: Worker[];
  admins: Admin[];
  shifts: Shift[];
  hazards: Hazard[];
  feedback: FeedbackEntry[];
  skills: Skill[];
  paidRecords: PaidRecordEntry[];
  payDisputes: PayDispute[];
  issues: SiteIssue[];
  certificates: CertificateRequest[];
  payoutAccounts: PayoutAccount[];
  payoutBatches: PayoutBatch[];
}

// Simple seeded PRNG (mulberry32)
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const closedIn = (shifts: Shift[], month: string): ClosedShift[] => {
  const { start, end } = monthRange(month);
  return shifts.filter((s): s is ClosedShift => Boolean(s.outAt) && s.inAt >= start && s.inAt < end);
};

type PaidAdjustment = (record: PaidRecordEntry) => PaidRecordEntry;

/** Hours and pay exactly as FairShift computes them, i.e. what a fair employer would have paid. */
function fairPaidRecord(worker: Worker, org: Org, shifts: Shift[], month: string, recordedAt: Date): PaidRecordEntry {
  const own = closedIn(shifts, month);
  const base = computePayslip(worker.id, month, own, worker.pay, org.labourRules);
  const regular = base.lines.find((l) => l.kind === "regular");
  const overtime = base.lines.find((l) => l.kind === "overtime");
  const deductions = computeDeductions(regular?.amount ?? 0).reduce((sum, d) => sum + d.amount, 0);
  return {
    id: `${worker.id}:${month}`,
    orgId: worker.orgId,
    workerId: worker.id,
    month,
    paidRegularHours: (regular?.minutes ?? 0) / 60,
    paidOvertimeHours: (overtime?.minutes ?? 0) / 60,
    grossPaid: base.gross,
    deductions,
    netPaid: base.gross - deductions,
    recordedAt,
    recordedBy: worker.orgId === "org1" ? "admin1" : "admin2",
  };
}

const rate = (worker: Worker, org: Org) =>
  worker.pay.basis === "daily"
    ? Math.round(worker.pay.rate / org.labourRules.dailyHrs)
    : Math.round(worker.pay.rate / (org.labourRules.dailyHrs * 26));

/**
 * The month the demo's pay story lives in: the month pay screens open on (last month during the
 * payday window at the start of a month), so the story never disappears when a month turns over.
 */
const storyMonths = (now: Date) => {
  const story = payFocusMonth(now);
  const previous = monthKey(now, story === monthKey(now) ? -1 : -2);
  return { story, previous };
};

/** Pays `minutes` fewer regular hours than recorded, by the amount the pay check will find. */
function regularHoursShort(record: PaidRecordEntry, minutes: number, hourly: number): PaidRecordEntry {
  const recorded = Math.round(record.paidRegularHours * 60);
  const short = Math.round((recorded * hourly) / 60) - Math.round(((recorded - minutes) * hourly) / 60);
  return {
    ...record,
    paidRegularHours: (recorded - minutes) / 60,
    grossPaid: record.grossPaid - short,
    netPaid: record.netPaid - short,
  };
}

function buildPaidRecords(workers: Worker[], shifts: Shift[], now: Date): PaidRecordEntry[] {
  const { story: thisMonth, previous: lastMonth } = storyMonths(now);
  const orgOf = new Map(ORGS.map((o) => [o.id, o]));
  const byWorker = new Map<string, Shift[]>();
  for (const s of shifts) byWorker.set(s.workerId, [...(byWorker.get(s.workerId) ?? []), s]);

  const lastMonthAdjustments: Record<string, PaidAdjustment> = {
    // Arun: six regular hours left off the sheet (dispute since resolved).
    w1002: (r) => {
      const short =
        6 *
        rate(
          workers.find((w) => w.id === "w1002")!,
          orgOf.get("org1")!,
        );
      return {
        ...r,
        paidRegularHours: r.paidRegularHours - 6,
        grossPaid: r.grossPaid - short,
        netPaid: r.netPaid - short,
      };
    },
    // Lakshmi: ₹500 "uniform charge" withheld without being declared.
    w2003: (r) => ({ ...r, netPaid: r.netPaid - 500_00 }),
  };

  const records = workers.map((w) => {
    const record = fairPaidRecord(
      w,
      orgOf.get(w.orgId)!,
      byWorker.get(w.id) ?? [],
      lastMonth,
      new Date(now.getTime() - 25 * DAY_MS),
    );
    return lastMonthAdjustments[w.id]?.(record) ?? record;
  });

  // The story month: one payroll row for each outcome the employer can see.
  const org1 = orgOf.get("org1")!;
  const worker = (id: string) => workers.find((w) => w.id === id)!;
  const recordFor = (id: string) =>
    fairPaidRecord(worker(id), org1, byWorker.get(id) ?? [], thisMonth, new Date(now.getTime() - 2 * DAY_MS));
  // Dinesh: paid exactly what FairShift computed ("Matches").
  records.push(recordFor("w1004"));
  // Gopal: 9h 47m of regular hours left off the sheet ("Possible shortfall").
  records.push(regularHoursShort(recordFor("w1014"), 9 * 60 + 47, rate(worker("w1014"), org1)));
  // Babu: paid in full, but the sheet listed 11h 4m fewer regular hours; the employer paid the
  // difference the check found as arrears ("Gap paid").
  const babuFair = recordFor("w1008");
  const babuShort = regularHoursShort(babuFair, 11 * 60 + 4, rate(worker("w1008"), org1));
  records.push({
    ...babuFair,
    paidRegularHours: babuShort.paidRegularHours,
    arrears: [{ amount: babuFair.grossPaid - babuShort.grossPaid, at: new Date(now.getTime() - DAY_MS), by: "admin1" }],
  });
  // Arun has nothing entered yet ("Not entered").

  // Ramesh's advance sheet pays 9h of the 13h 32m overtime recorded.
  const ramesh = workers.find((w) => w.id === "w1001")!;
  const fair = fairPaidRecord(
    ramesh,
    orgOf.get("org1")!,
    byWorker.get("w1001") ?? [],
    thisMonth,
    new Date(now.getTime() - DAY_MS),
  );
  const otRate = rate(ramesh, orgOf.get("org1")!) * 2;
  const unpaidMinutes = Math.min(RAMESH_UNPAID_OT_MINUTES, fair.paidOvertimeHours * 60);
  const unpaid = Math.round((unpaidMinutes * otRate) / 60);
  records.push({
    ...fair,
    paidOvertimeHours: fair.paidOvertimeHours - unpaidMinutes / 60,
    grossPaid: fair.grossPaid - unpaid,
    netPaid: fair.netPaid - unpaid,
  });
  return records;
}

function buildDisputes(now: Date): PayDispute[] {
  const { previous: lastMonth } = storyMonths(now);
  const at = (days: number) => new Date(now.getTime() - days * DAY_MS);
  return [
    {
      id: "pd-1",
      orgId: "org1",
      workerId: "w1002",
      month: lastMonth,
      shortfall: 6 * 8_750,
      findings: ["REGULAR_UNDERPAID"],
      status: "resolved",
      resolutionNote: "Six hours were missed in the register. ₹525 balance paid with the advance on the 5th.",
      createdAt: at(22),
      updatedAt: at(18),
    },
    {
      id: "pd-2",
      orgId: "org2",
      workerId: "w2003",
      month: lastMonth,
      shortfall: 500_00,
      findings: ["DEDUCTION_MISMATCH"],
      status: "reviewing",
      createdAt: at(6),
      updatedAt: at(4),
    },
  ];
}

function buildCertificates(shifts: Shift[], now: Date): CertificateRequest[] {
  const yearAgo = getISTDay(new Date(now.getTime() - 365 * DAY_MS));
  const daysFor = (workerId: string) =>
    [...minutesByDay(shifts.filter((s): s is ClosedShift => s.workerId === workerId && Boolean(s.outAt))).keys()]
      .filter((d) => d >= yearAgo)
      .sort();
  const request = (
    id: string,
    workerId: string,
    status: CertificateRequest["status"],
    requestedDaysAgo: number,
  ): CertificateRequest => {
    const days = daysFor(workerId);
    return {
      id,
      orgId: "org1",
      workerId,
      schemeId: "bocw",
      status,
      daysWorked: days.length,
      from: days[0],
      to: days[days.length - 1],
      requestedAt: new Date(now.getTime() - requestedDaysAgo * DAY_MS),
      ...(status === "approved"
        ? { decidedAt: new Date(now.getTime() - (requestedDaysAgo - 1) * DAY_MS), decidedBy: "admin1" }
        : {}),
    };
  };
  return [request("cert-1", "w1003", "requested", 2), request("cert-2", "w1005", "approved", 20)];
}

export function getSeedData(now: Date): SeedData {
  const rand = mulberry32(42);
  const workers = buildWorkers(now, rameshJoinedAt(now));
  const shifts = generateShifts(workers, now, rand);
  return {
    orgs: ORGS.map((o) => ({ ...o })),
    sites: SITES.map((s) => ({ ...s })),
    workers,
    admins: buildAdmins(),
    shifts,
    hazards: buildHazards(now),
    feedback: buildFeedback(now, rand),
    skills: SKILLS.map((s) => ({ ...s })),
    paidRecords: buildPaidRecords(workers, shifts, now),
    payDisputes: buildDisputes(now),
    issues: buildIssues(now),
    certificates: buildCertificates(shifts, now),
    payoutAccounts: buildPayoutAccounts(workers, now),
    payoutBatches: [],
  };
}
