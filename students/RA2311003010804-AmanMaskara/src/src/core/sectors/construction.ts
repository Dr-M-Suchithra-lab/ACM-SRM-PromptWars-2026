import { SectorProfile } from "../types";
import { DEFAULT_LABOUR_RULES } from "../overtime";

export const construction: SectorProfile = {
  sector: "construction",
  defaultPayBasis: "daily",
  standardShiftHours: 8,
  hazardCategories: [
    "fire",
    "fall_from_height",
    "scaffolding",
    "electrical",
    "heat_stress",
    "ppe_missing",
    "machinery",
  ],
  fatigueRules: [
    { ruleId: "con-daily-10h", check: "maxDailyHours", threshold: 10 },
    { ruleId: "con-rest-11h", check: "minRestHours", threshold: 11 },
    { ruleId: "con-days-6", check: "maxConsecutiveDays", threshold: 6 },
    { ruleId: "con-weekly-48h", check: "maxWeeklyHours", threshold: 48 },
  ],
  labourRules: DEFAULT_LABOUR_RULES,
};
