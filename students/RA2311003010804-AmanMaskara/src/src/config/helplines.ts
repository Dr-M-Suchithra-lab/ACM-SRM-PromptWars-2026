// ─── Free helplines for workers in India ────────────────────────────
// Every number here is fixed in code: Gemini can only pick ids from this list and never writes
// a number itself. Checked against government listings (ERSS 112, eshram.gov.in helpdesk,
// esic.gov.in contact page, EPFO, Tele-MANAS) in October 2026. 108 is the emergency ambulance
// in most states; 112 reaches police, fire and ambulance everywhere.

export const HELPLINE_IDS = [
  "emergency",
  "fire",
  "ambulance",
  "women",
  "mental_health",
  "eshram",
  "esic",
  "epfo",
] as const;
export type HelplineId = (typeof HELPLINE_IDS)[number];

export interface Helpline {
  id: HelplineId;
  /** As shown on screen */
  number: string;
  /** For the tel: link */
  dial: string;
  /** Answers around the clock */
  allDay: boolean;
  kind: "emergency" | "support" | "rights";
}

export const HELPLINES: readonly Helpline[] = [
  { id: "emergency", number: "112", dial: "112", allDay: true, kind: "emergency" },
  { id: "fire", number: "101", dial: "101", allDay: true, kind: "emergency" },
  { id: "ambulance", number: "108", dial: "108", allDay: true, kind: "emergency" },
  { id: "women", number: "181", dial: "181", allDay: true, kind: "support" },
  { id: "mental_health", number: "14416", dial: "14416", allDay: true, kind: "support" },
  { id: "eshram", number: "14434", dial: "14434", allDay: false, kind: "rights" },
  { id: "esic", number: "1800-11-2526", dial: "1800112526", allDay: false, kind: "rights" },
  { id: "epfo", number: "14470", dial: "14470", allDay: false, kind: "rights" },
];

export function getHelpline(id: HelplineId): Helpline {
  return HELPLINES.find((h) => h.id === id) ?? HELPLINES[0];
}
