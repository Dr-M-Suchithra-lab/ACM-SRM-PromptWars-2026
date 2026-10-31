/**
 * Repository interfaces for the FairShift data layer.
 * Implementations: in-memory (dev, tests) and MongoDB (production).
 */
import type { Hazard, Sector, Shift } from "@/core/types";
import type { PaidRecord, FindingCode } from "@/core/pay-check";
import type { IssueStatus } from "@/core/cosign";
import type { SkillLevel } from "@/config/minimum-wage";

export type { Hazard, Shift };

export interface Org {
  id: string;
  name: string;
  sector: Sector;
  labourRules: {
    dailyHrs: number;
    weeklyHrs: number;
    otMultiplier: number;
  };
}

export interface Site {
  id: string;
  orgId: string;
  name: string;
  sector: Sector;
  /** State code used for the minimum-wage table, e.g. "TN" */
  state: string;
  geofence?: { lat: number; lng: number; radiusM: number };
  qrSecret: string;
}

/** Work a worker did before FairShift, entered by them: shown but never counted as verified. */
export interface SelfReportedWork {
  employer: string;
  role: string;
  sector: Sector;
  from: string;
  to: string;
}

export interface Worker {
  id: string;
  orgId: string;
  siteId: string;
  name: string;
  code: string;
  pinHash: string;
  pinSalt: string;
  lang: string;
  role: "worker";
  /** Job title shown on the skill passport, e.g. "Mason" */
  jobTitle: string;
  skillLevel: SkillLevel;
  pay: {
    basis: "daily" | "monthly" | "hourly";
    rate: number; // paise
  };
  joinedAt: Date;
  pastWork?: SelfReportedWork[];
}

export interface Admin {
  id: string;
  orgId: string;
  name: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  role: "admin";
  siteIds: string[];
}

export interface FeedbackEntry {
  id: string;
  orgId: string;
  siteId: string;
  cohort: string;
  weekBucket: string;
  scores: { pay: number; safety: number; respect: number };
  comment?: string;
  themes?: string[];
  sentiment?: number;
  createdAt: Date;
  // NO workerId — anonymity by design
}

export interface Skill {
  id: string;
  workerId: string;
  title: string;
  issuer: string;
  date: Date;
  /** Admin who verified it; absent while pending */
  verifiedBy?: string;
  /** The employer could not confirm it: kept for the worker, never shown on the passport */
  rejected?: boolean;
  decidedAt?: Date;
  /** Certificate number or a short note from the worker */
  evidence?: string;
  /** Who added it: the worker (needs verifying) or an admin (verified on entry) */
  addedBy?: "worker" | "admin";
  createdAt?: Date;
}

/** What the employer actually paid one worker for one month (FairPay Sentinel's second source). */
export interface PaidRecordEntry extends PaidRecord {
  /** `${workerId}:${month}` — one record per worker and month */
  id: string;
  orgId: string;
  workerId: string;
  month: string;
  recordedAt: Date;
  recordedBy: string;
  /** Top-up payments made after FairPay Sentinel found a gap (paise each) */
  arrears?: { amount: number; at: Date; by: string }[];
}

export type DisputeStatus = "open" | "reviewing" | "resolved";

export interface PayDispute {
  id: string;
  orgId: string;
  workerId: string;
  month: string;
  /** Possible shortfall in paise when the worker asked for a review */
  shortfall: number;
  findings: FindingCode[];
  status: DisputeStatus;
  resolutionNote?: string;
  /** Arrears paid to settle it (paise), when it was resolved by paying the gap */
  settledAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

/** A co-signed site issue. No signer or creator identity is ever stored. */
export interface SiteIssue {
  id: string;
  orgId: string;
  siteId: string;
  /** PII-scrubbed text */
  text: string;
  signerCount: number;
  status: IssueStatus;
  /** Management's reply, shown to every worker at the site */
  response?: string;
  /** Day precision only ('YYYY-MM-DD', IST) so times can't be matched to check-ins */
  createdDay: string;
  updatedDay: string;
}

export type CertificateStatus = "requested" | "approved" | "rejected";

/** A worker's request for an employer-signed work certificate (e.g. 90 days for the BOCW board). */
export interface CertificateRequest {
  id: string;
  orgId: string;
  workerId: string;
  schemeId: string;
  status: CertificateStatus;
  daysWorked: number;
  /** IST days 'YYYY-MM-DD' */
  from: string;
  to: string;
  requestedAt: Date;
  decidedAt?: Date;
  decidedBy?: string;
}

export interface AiLogEntry {
  feature: "hazard" | "explainPay" | "brief" | "similar" | "tts" | "help";
  model: string;
  latencyMs: number;
  fallbackUsed: boolean;
  /** Short error class when the call failed, never prompt or output content */
  error?: string;
  at: Date;
}

export interface OrgRepo {
  getAll(): Promise<Org[]>;
  getById(id: string): Promise<Org | undefined>;
}

export interface SiteRepo {
  getAll(): Promise<Site[]>;
  getByOrg(orgId: string): Promise<Site[]>;
  getById(id: string): Promise<Site | undefined>;
}

export interface WorkerRepo {
  getAll(): Promise<Worker[]>;
  getByOrg(orgId: string): Promise<Worker[]>;
  getByCode(code: string): Promise<Worker | undefined>;
  getById(id: string): Promise<Worker | undefined>;
}

export interface AdminRepo {
  getAll(): Promise<Admin[]>;
  getByEmail(email: string): Promise<Admin | undefined>;
  getById(id: string): Promise<Admin | undefined>;
}

export interface ShiftRepo {
  getAll(): Promise<Shift[]>;
  getByWorker(workerId: string): Promise<Shift[]>;
  /** One query for many workers (avoids N+1 round trips on dashboards). */
  getByWorkers(workerIds: string[]): Promise<Shift[]>;
  /** Only the shifts still open (no check-out yet): what "on duty" needs, without the history. */
  getOpenByWorkers(workerIds: string[]): Promise<Shift[]>;
  getByWorkerInRange(workerId: string, from: Date, to: Date): Promise<Shift[]>;
  /** One query for many workers' shifts in a window (payroll for a whole organisation). */
  getByWorkersInRange(workerIds: string[], from: Date, to: Date): Promise<Shift[]>;
  getBySite(siteId: string): Promise<Shift[]>;
  create(shift: Shift): Promise<void>;
  update(id: string, data: Partial<Shift>): Promise<void>;
}

export interface HazardRepo {
  getAll(): Promise<Hazard[]>;
  getByOrg(orgId: string): Promise<Hazard[]>;
  getById(id: string): Promise<Hazard | undefined>;
  create(hazard: Hazard): Promise<void>;
  update(id: string, data: Partial<Hazard>): Promise<void>;
}

export interface FeedbackRepo {
  getAll(): Promise<FeedbackEntry[]>;
  getByOrg(orgId: string): Promise<FeedbackEntry[]>;
  getByCohortAndWeek(cohort: string, weekBucket: string): Promise<FeedbackEntry[]>;
  create(entry: FeedbackEntry): Promise<void>;
}

/** One-way HMAC keys that stop double voting/signing without storing who did it. */
export interface GuardRepo {
  has(key: string): Promise<boolean>;
  add(key: string): Promise<void>;
}

export interface SkillRepo {
  getByWorker(workerId: string): Promise<Skill[]>;
  /** One query for many workers (the admin's verification queue) */
  getByWorkers(workerIds: string[]): Promise<Skill[]>;
  getById(id: string): Promise<Skill | undefined>;
  create(skill: Skill): Promise<void>;
  update(id: string, data: Partial<Skill>): Promise<void>;
}

export interface PaidRecordRepo {
  getByOrgMonth(orgId: string, month: string): Promise<PaidRecordEntry[]>;
  get(workerId: string, month: string): Promise<PaidRecordEntry | undefined>;
  /** Insert or replace the record for that worker and month */
  upsert(record: PaidRecordEntry): Promise<void>;
}

export interface PayDisputeRepo {
  getByOrg(orgId: string): Promise<PayDispute[]>;
  getByWorker(workerId: string): Promise<PayDispute[]>;
  getById(id: string): Promise<PayDispute | undefined>;
  create(dispute: PayDispute): Promise<void>;
  update(id: string, data: Partial<PayDispute>): Promise<void>;
}

export interface IssueRepo {
  getBySite(siteId: string): Promise<SiteIssue[]>;
  getByOrg(orgId: string): Promise<SiteIssue[]>;
  getById(id: string): Promise<SiteIssue | undefined>;
  create(issue: SiteIssue): Promise<void>;
  update(id: string, data: Partial<SiteIssue>): Promise<void>;
}

export interface CertificateRepo {
  getByOrg(orgId: string): Promise<CertificateRequest[]>;
  getByWorker(workerId: string): Promise<CertificateRequest[]>;
  getById(id: string): Promise<CertificateRequest | undefined>;
  create(request: CertificateRequest): Promise<void>;
  update(id: string, data: Partial<CertificateRequest>): Promise<void>;
}

export interface AiLogRepo {
  add(entry: AiLogEntry): Promise<void>;
  recent(limit: number): Promise<AiLogEntry[]>;
}

/** Synthesised speech, keyed by a hash of locale + text. */
export interface TtsCacheRepo {
  get(key: string): Promise<string | undefined>;
  set(key: string, wavBase64: string): Promise<void>;
}

export interface Repos {
  orgs: OrgRepo;
  sites: SiteRepo;
  workers: WorkerRepo;
  admins: AdminRepo;
  shifts: ShiftRepo;
  hazards: HazardRepo;
  feedback: FeedbackRepo;
  skills: SkillRepo;
  feedbackGuards: GuardRepo;
  paidRecords: PaidRecordRepo;
  payDisputes: PayDisputeRepo;
  issues: IssueRepo;
  issueSigners: GuardRepo;
  certificates: CertificateRepo;
  aiLog: AiLogRepo;
  ttsCache: TtsCacheRepo;
}
