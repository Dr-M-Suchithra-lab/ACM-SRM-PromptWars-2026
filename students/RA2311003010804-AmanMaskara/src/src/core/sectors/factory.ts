import { SectorProfile } from "../types";
import { DEFAULT_LABOUR_RULES } from "../overtime";

export const factory: SectorProfile = {
  sector: "factory",
  defaultPayBasis: "hourly",
  standardShiftHours: 8,
  hazardCategories: ["fire", "machinery_guard", "noise", "chemical", "fire_exit", "ppe_missing"],
  fatigueRules: [
    { ruleId: "fac-daily-10h", check: "maxDailyHours", threshold: 10 },
    { ruleId: "fac-rest-11h", check: "minRestHours", threshold: 11 },
    { ruleId: "fac-days-6", check: "maxConsecutiveDays", threshold: 6 },
    { ruleId: "fac-weekly-48h", check: "maxWeeklyHours", threshold: 48 },
  ],
  labourRules: DEFAULT_LABOUR_RULES,
};
