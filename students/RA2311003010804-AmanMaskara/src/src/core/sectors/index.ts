import { Sector, SectorProfile } from "../types";
import { construction } from "./construction";
import { hospital } from "./hospital";
import { campus } from "./campus";
import { factory } from "./factory";

export const SECTOR_PROFILES: Record<Sector, SectorProfile> = {
  construction,
  hospital,
  campus,
  factory,
};

export function getSectorProfile(sector: Sector): SectorProfile {
  return SECTOR_PROFILES[sector];
}
