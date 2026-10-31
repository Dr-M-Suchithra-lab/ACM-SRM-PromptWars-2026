// ─── Hazard resolution deadlines and escalation chains ──────────────
// Tune per organisation. Deadlines are measured from when a report was received
// (or last reopened). Each missed deadline moves the report one level up the chain.

import type { HazardSeverity, Sector } from "@/core/types";

const HOUR_MS = 60 * 60 * 1000;

export const RESOLUTION_DEADLINE_MS: Record<HazardSeverity, number> = {
  critical: 4 * HOUR_MS, // "Danger now"
  high: 24 * HOUR_MS,
  medium: 72 * HOUR_MS,
  low: 7 * 24 * HOUR_MS,
};

/** Share of the deadline after which a timer turns amber. */
export const DUE_SOON_SHARE = 0.75;

/** A fixed report closes by itself if the reporter does not answer "Is it really fixed?" in time. */
export const CONFIRM_WINDOW_MS = 3 * 24 * HOUR_MS;

/** Reports of the same kind at the same place within this window are merged. */
export const DUPLICATE_WINDOW_MS = 48 * HOUR_MS;

/** From this many reports on one hazard, its severity goes up one level. */
export const REPORTS_FOR_SEVERITY_BUMP = 3;

export type EscalationRole =
  "supervisor" | "site_manager" | "safety_officer" | "ward_in_charge" | "nursing_superintendent" | "hospital_safety_hr";

export const ESCALATION_CHAINS: Record<Sector, readonly EscalationRole[]> = {
  construction: ["supervisor", "site_manager", "safety_officer"],
  factory: ["supervisor", "site_manager", "safety_officer"],
  hospital: ["ward_in_charge", "nursing_superintendent", "hospital_safety_hr"],
  campus: ["supervisor", "site_manager", "hospital_safety_hr"],
};

export const DISMISS_REASONS = ["duplicate", "not_a_hazard", "already_fixed", "other"] as const;
export type DismissReason = (typeof DISMISS_REASONS)[number];
