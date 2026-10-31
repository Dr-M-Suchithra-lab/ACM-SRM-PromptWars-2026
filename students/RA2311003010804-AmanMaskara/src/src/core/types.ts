// ─── FairShift Core Types ───────────────────────────────────────────
// All money values are in integer paise (1 INR = 100 paise).
// All timestamps use Asia/Kolkata timezone.

export type Sector = "construction" | "hospital" | "campus" | "factory";

export type PayBasis = "daily" | "monthly" | "hourly";

export type Role = "worker" | "admin";

export type HazardSeverity = "critical" | "high" | "medium" | "low";

export type HazardStatus = "received" | "in_progress" | "fixed" | "dismissed";

export type HazardCategory =
  // Every sector: a fire is an emergency anywhere
  | "fire"
  // Construction
  | "fall_from_height"
  | "scaffolding"
  | "electrical"
  | "heat_stress"
  | "ppe_missing"
  | "machinery"
  // Hospital
  | "needle_stick"
  | "chemical_biohazard"
  | "patient_aggression"
  | "slip"
  | "lifting_injury"
  // Campus
  | "chemical_labs"
  // Factory
  | "machinery_guard"
  | "noise"
  | "chemical"
  | "fire_exit";

export type FeedbackScore = 1 | 2 | 3; // 1 = 😟, 2 = 😐, 3 = 😀

// ─── Hazard ─────────────────────────────────────────────────────────

/** Everything that can appear in a hazard's history. */
export type HazardEvent =
  HazardStatus | "reopened" | "escalated" | "confirmed" | "auto_closed" | "report_added" | "merged" | "unmerged";

export interface HazardTimelineEntry {
  status: HazardEvent;
  at: Date;
  /** Admin uid for management actions; never a worker id */
  by?: string;
  note?: string;
  /** Escalation level reached (for 'escalated') */
  level?: number;
}

/** One worker's report. Several reports of the same danger are merged into one hazard. */
export interface HazardReport {
  /** null when the worker hid their name */
  reporterId: string | null;
  transcript?: string;
  transcriptEn?: string;
  photoDataUrl?: string;
  at: Date;
  /** Set when this report came from a hazard an admin merged in by hand */
  fromHazardId?: string;
}

/** After "fixed", the reporter is asked whether it really is. */
export type FixConfirmation = "pending" | "confirmed" | "auto_closed";

export interface Hazard {
  id: string;
  siteId: string;
  orgId: string;
  category: HazardCategory;
  /** Severity before any bump for repeated reports */
  baseSeverity: HazardSeverity;
  severity: HazardSeverity;
  status: HazardStatus;
  /** Zone / floor / ward, free text */
  location?: string;
  reports: HazardReport[];
  timeline: HazardTimelineEntry[];
  createdAt: Date;
  /** 0 = not escalated; n = escalated to the n-th role in the sector's chain */
  escalationLevel: number;
  assigneeUid?: string;
  fixNote?: string;
  fixPhotoDataUrl?: string;
  confirmation?: FixConfirmation;
  dismissReason?: string;
  dismissNote?: string;
  /** Set when an admin merged this hazard into another one */
  mergedInto?: string;
  /** HMAC of anonymous reporters' private tracking references */
  trackingRefs: string[];
}

// ─── Shift ──────────────────────────────────────────────────────────

export interface Shift {
  id: string;
  workerId: string;
  siteId: string;
  inAt: Date;
  outAt?: Date;
  method: "qr" | "geo" | "manual";
  /** Idempotency key of the check-in operation */
  clientOpId?: string;
  /** Idempotency key of the check-out operation */
  outOpId?: string;
  syncedFromOffline?: boolean;
}

/** A shift that has been closed (outAt is guaranteed to be present). */
export interface ClosedShift extends Shift {
  outAt: Date;
}

// ─── Labour & Pay ───────────────────────────────────────────────────

export interface LabourRules {
  dailyHrs: number;
  weeklyHrs: number;
  otMultiplier: number;
}

export interface PayConfig {
  basis: PayBasis;
  /** Rate in paise. For daily: daily wage. For monthly: monthly salary. For hourly: hourly rate. */
  rate: number;
}

export interface PayslipLine {
  kind: "regular" | "overtime" | "deduction";
  /** i18n key for regular/overtime; free text for deductions */
  label: string;
  minutes?: number;
  /** Hourly rate in paise */
  rate?: number;
  /** Amount in paise */
  amount: number;
}

export interface Payslip {
  workerId: string;
  period: string;
  lines: PayslipLine[];
  gross: number;
  deductions: PayslipLine[];
  net: number;
  overtimeBasis: "daily" | "weekly" | "mixed" | "none";
}

// ─── Fatigue ────────────────────────────────────────────────────────

export interface FatigueAlert {
  ruleId: string;
  messageKey: string;
  evidence: Record<string, unknown>;
}

export interface FatigueRuleConfig {
  ruleId: string;
  check: "maxDailyHours" | "minRestHours" | "maxConsecutiveDays" | "maxConsecutiveNights" | "maxWeeklyHours";
  threshold: number;
}

// ─── Risk ───────────────────────────────────────────────────────────

export interface QuitRiskResult {
  score: number;
  reasons: {
    factor: string;
    weight: number;
    value: number;
    detail: string;
  }[];
}

// ─── Alerts ─────────────────────────────────────────────────────────

export interface Alert {
  id: string;
  orgId: string;
  workerId: string;
  type: "fatigue" | "quitRisk";
  score?: number;
  reasons: string[];
  at: Date;
  ack?: boolean;
}

// ─── Sector Profile ─────────────────────────────────────────────────

export interface SectorProfile {
  sector: Sector;
  defaultPayBasis: PayBasis;
  standardShiftHours: number;
  hazardCategories: HazardCategory[];
  fatigueRules: FatigueRuleConfig[];
  labourRules: LabourRules;
}
