// ─── Minimum wage table (DEMO VALUES) ───────────────────────────────
// These figures are illustrative and rounded. Minimum wages in India are notified per
// state, per scheduled employment and per skill level, and are revised (VDA) twice a year.
// Before relying on them, replace each row with the current notification for your state.

import type { Sector } from "@/core/types";

export type SkillLevel = "unskilled" | "semi_skilled" | "skilled";

export interface MinimumWageRate {
  state: string;
  sector: Sector;
  skill: SkillLevel;
  /** Minimum daily wage in paise for a standard working day */
  dailyRate: number;
  /** Hours in the standard working day the daily rate covers */
  dailyHours: number;
  /** Where the figure comes from */
  source: string;
}

export const MINIMUM_WAGE_DISCLAIMER = "demo-values-verify-for-your-state";

export const MINIMUM_WAGES: readonly MinimumWageRate[] = [
  {
    state: "TN",
    sector: "construction",
    skill: "unskilled",
    dailyRate: 52_500,
    dailyHours: 8,
    source: "Demo value modelled on Tamil Nadu construction notification",
  },
  {
    state: "TN",
    sector: "construction",
    skill: "semi_skilled",
    dailyRate: 58_000,
    dailyHours: 8,
    source: "Demo value modelled on Tamil Nadu construction notification",
  },
  {
    state: "TN",
    sector: "construction",
    skill: "skilled",
    dailyRate: 64_000,
    dailyHours: 8,
    source: "Demo value modelled on Tamil Nadu construction notification",
  },
  {
    state: "UP",
    sector: "hospital",
    skill: "unskilled",
    dailyRate: 41_200,
    dailyHours: 8,
    source: "Demo value modelled on Uttar Pradesh shops & establishments notification",
  },
  {
    state: "UP",
    sector: "hospital",
    skill: "semi_skilled",
    dailyRate: 45_300,
    dailyHours: 8,
    source: "Demo value modelled on Uttar Pradesh shops & establishments notification",
  },
  {
    state: "UP",
    sector: "hospital",
    skill: "skilled",
    dailyRate: 50_700,
    dailyHours: 8,
    source: "Demo value modelled on Uttar Pradesh shops & establishments notification",
  },
];

/** Central floor-level wage used when a state/sector row is missing (demo value). */
export const NATIONAL_FLOOR: MinimumWageRate = {
  state: "IN",
  sector: "construction",
  skill: "unskilled",
  dailyRate: 17_800,
  dailyHours: 8,
  source: "Demo value modelled on the national floor-level minimum wage",
};

export function findMinimumWage(state: string, sector: Sector, skill: SkillLevel): MinimumWageRate {
  return MINIMUM_WAGES.find((r) => r.state === state && r.sector === sector && r.skill === skill) ?? NATIONAL_FLOOR;
}
