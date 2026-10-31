import { SectorProfile } from "../types";
import { DEFAULT_LABOUR_RULES } from "../overtime";

export const hospital: SectorProfile = {
  sector: "hospital",
  defaultPayBasis: "monthly",
  standardShiftHours: 8,
  hazardCategories: [
    "fire",
    "needle_stick",
    "chemical_biohazard",
    "patient_aggression",
    "slip",
    "lifting_injury",
    "ppe_missing",
  ],
  fatigueRules: [
    { ruleId: "hos-nights-2", check: "maxConsecutiveNights", threshold: 2 },
    { ruleId: "hos-rest-11h", check: "minRestHours", threshold: 11 },
    { ruleId: "hos-weekly-48h", check: "maxWeeklyHours", threshold: 48 },
    { ruleId: "hos-daily-12h", check: "maxDailyHours", threshold: 12 },
  ],
  labourRules: DEFAULT_LABOUR_RULES,
};
