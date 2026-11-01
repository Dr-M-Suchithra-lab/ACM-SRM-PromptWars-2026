import { SectorProfile } from "../types";
import { DEFAULT_LABOUR_RULES } from "../overtime";

export const campus: SectorProfile = {
  sector: "campus",
  defaultPayBasis: "monthly",
  standardShiftHours: 8,
  hazardCategories: ["fire", "electrical", "slip", "chemical_labs", "ppe_missing"],
  fatigueRules: [
    { ruleId: "cam-daily-10h", check: "maxDailyHours", threshold: 10 },
    { ruleId: "cam-rest-11h", check: "minRestHours", threshold: 11 },
    { ruleId: "cam-weekly-48h", check: "maxWeeklyHours", threshold: 48 },
  ],
  labourRules: DEFAULT_LABOUR_RULES,
};
