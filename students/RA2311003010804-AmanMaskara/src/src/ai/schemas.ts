import { z } from "zod";

export const HAZARD_CATEGORIES = [
  "fire",
  "fall_from_height",
  "scaffolding",
  "electrical",
  "heat_stress",
  "ppe_missing",
  "machinery",
  "needle_stick",
  "chemical_biohazard",
  "patient_aggression",
  "slip",
  "lifting_injury",
  "chemical_labs",
  "machinery_guard",
  "noise",
  "chemical",
  "fire_exit",
  "other",
] as const;

export const SEVERITIES = ["low", "medium", "high", "critical"] as const;

export const HazardExtraction = z.object({
  transcript: z.string().max(500).describe("What the worker said, in their own language"),
  transcriptEn: z.string().max(500).describe("English translation of the transcript"),
  category: z.enum(HAZARD_CATEGORIES),
  severityHint: z.enum(SEVERITIES),
  locationHint: z.string().max(120).describe("Where on site, if mentioned, else empty"),
});
export type HazardExtraction = z.infer<typeof HazardExtraction>;

export const PayExplanation = z.object({
  sentences: z.array(z.string().max(200)).min(1).max(4),
});

export const hazardJsonSchema = z.toJSONSchema(HazardExtraction);
export const payJsonSchema = z.toJSONSchema(PayExplanation);
