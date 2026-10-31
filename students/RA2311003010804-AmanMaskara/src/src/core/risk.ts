// ─── FairShift Quit-Risk Scoring ────────────────────────────────────
// Transparent, explainable scoring — not a black box.
// The individual score uses only signals about that worker. Conditions everyone at a
// site shares (open hazards, team mood) are scored separately as site context, so they
// can't inflate every worker's score by the same amount.

import { QuitRiskResult } from "./types";

export const INDIVIDUAL_WEIGHTS = {
  overtime: 40,
  missedDays: 35,
  payDisputes: 25,
} as const;

export const SITE_WEIGHTS = {
  mood: 60,
  hazards: 40,
} as const;

/** Reference "bad" values: reaching them scores the factor at 1.0. */
const OVERTIME_REF_MIN = 600; // 10h of overtime in one week
const MISSED_DAYS_REF = 5;
const PAY_DISPUTES_REF = 2;
const OPEN_HAZARDS_REF = 3;
const RISING_TREND_BOOST = 1.2;

export interface IndividualSignals {
  overtimeMinThisWeek: number;
  overtimeMinLastWeek: number;
  missedCheckIns: number;
  /** Open or reviewing pay disputes raised by this worker */
  payDisputes: number;
}

export interface SiteSignals {
  /** 1–3, from feedback groups that passed the k-anonymity gate */
  teamMoodAvg: number;
  unresolvedHazards: number;
}

function total(reasons: QuitRiskResult["reasons"]): number {
  const score = reasons.reduce((sum, r) => sum + r.value * r.weight, 0);
  return Math.round(Math.min(100, Math.max(0, score)));
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Individual quit-risk (0–100), each factor scored 0–1 then weighted:
 * - overtime: this week's overtime vs 10h; a rising trend (more than last week) adds 20%.
 * - missedDays: missed working days vs 5.
 * - payDisputes: open pay disputes vs 2.
 */
export function computeQuitRisk(signals: IndividualSignals): QuitRiskResult {
  const rising = signals.overtimeMinThisWeek > signals.overtimeMinLastWeek;
  let overtime = Math.min(signals.overtimeMinThisWeek / OVERTIME_REF_MIN, 1);
  if (rising) overtime = Math.min(overtime * RISING_TREND_BOOST, 1);

  const reasons: QuitRiskResult["reasons"] = [
    {
      factor: "overtime",
      weight: INDIVIDUAL_WEIGHTS.overtime,
      value: round2(overtime),
      detail: `OT this week: ${signals.overtimeMinThisWeek}min, last week: ${signals.overtimeMinLastWeek}min${rising ? " (rising trend)" : ""}`,
    },
    {
      factor: "missedDays",
      weight: INDIVIDUAL_WEIGHTS.missedDays,
      value: round2(Math.min(signals.missedCheckIns / MISSED_DAYS_REF, 1)),
      detail: `${signals.missedCheckIns} missed working days (reference: ${MISSED_DAYS_REF})`,
    },
    {
      factor: "payDisputes",
      weight: INDIVIDUAL_WEIGHTS.payDisputes,
      value: round2(Math.min(signals.payDisputes / PAY_DISPUTES_REF, 1)),
      detail: `${signals.payDisputes} open pay disputes (reference: ${PAY_DISPUTES_REF})`,
    },
  ];
  return { score: total(reasons), reasons };
}

/**
 * Site context (0–100), shown next to — never added to — individual scores:
 * - mood: inverted team mood, (3 − mood) / 2.
 * - hazards: open hazards vs 3.
 */
export function computeSiteRisk(signals: SiteSignals): QuitRiskResult {
  const mood = Math.max(1, Math.min(3, signals.teamMoodAvg));
  const reasons: QuitRiskResult["reasons"] = [
    {
      factor: "mood",
      weight: SITE_WEIGHTS.mood,
      value: round2((3 - mood) / 2),
      detail: `Team mood avg: ${signals.teamMoodAvg}/3`,
    },
    {
      factor: "hazards",
      weight: SITE_WEIGHTS.hazards,
      value: round2(Math.min(signals.unresolvedHazards / OPEN_HAZARDS_REF, 1)),
      detail: `${signals.unresolvedHazards} unresolved hazards (reference: ${OPEN_HAZARDS_REF})`,
    },
  ];
  return { score: total(reasons), reasons };
}
