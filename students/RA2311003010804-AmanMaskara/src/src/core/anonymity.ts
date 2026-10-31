// ─── FairShift Anonymity Rules ──────────────────────────────────────
// Feedback is shown to employers only for groups of at least K responses,
// so no single answer can be traced back to one worker.

import { getISTWeekBucket } from "./time";

export const K_ANONYMITY = 5;

export type GateResult<T> =
  { visible: true; count: number; items: T[] } | { visible: false; count: number; needed: number };

/** Hide a cohort's items unless there are at least `k` of them. */
export function kAnonymityGate<T>(items: T[], k: number = K_ANONYMITY): GateResult<T> {
  if (items.length >= k) return { visible: true, count: items.length, items };
  return { visible: false, count: items.length, needed: k };
}

/** Cohort key used to group feedback: one site + one team role. */
export function cohortKey(siteId: string, team: string): string {
  return `${siteId}:${team.trim().toLowerCase()}`;
}

/** Week bucket ('YYYY-Www', IST) a feedback response belongs to. */
export function feedbackWeek(at: Date): string {
  return getISTWeekBucket(at);
}

/** Group items by key and apply the k-anonymity gate to each group. */
export function gateByCohort<T>(
  items: T[],
  keyOf: (item: T) => string,
  k: number = K_ANONYMITY,
): Map<string, GateResult<T>> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const gated = new Map<string, GateResult<T>>();
  for (const [key, group] of groups) gated.set(key, kAnonymityGate(group, k));
  return gated;
}
