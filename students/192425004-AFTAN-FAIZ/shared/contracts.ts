import { z } from "zod";
export const uuid = z.string().uuid();
export const reviewInput = z
  .object({ shift_id: uuid, reason: z.string().trim().min(10).max(1000) })
  .strict();
export const resolveInput = z
  .object({
    dispute_id: uuid,
    corrected_paise: z.number().int().min(0).max(100000000),
    explanation: z.string().trim().min(10).max(2000),
  })
  .strict();
export const safetyInput = z
  .object({
    organization_id: uuid,
    category: z.enum([
      "equipment",
      "fall_hazard",
      "sanitation",
      "workload",
      "other",
    ]),
    description: z.string().trim().min(20).max(4000),
    priority: z.enum(["normal", "high"]),
  })
  .strict();
export const safetyStatus = z.enum([
  "submitted",
  "acknowledged",
  "under_review",
  "action_assigned",
  "mitigated",
  "closed",
]);
export const safetyUpdateInput = z
  .object({
    report_id: uuid,
    status: safetyStatus,
    note: z.string().trim().min(10).max(2000),
  })
  .strict();
export const trackingInput = z
  .object({
    reference: z.string().regex(/^FS-[A-F0-9]{16}$/),
    token: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export const assistantInput = z
  .object({
    topic: z.enum(["pay", "safety", "rest", "cases"]),
    language: z.enum(["en", "ta", "hi"]),
    shift_id: uuid.optional(),
    organization_id: uuid.optional(),
    question: z.string().trim().min(1).max(600).optional(),
  })
  .strict();
export const aiOutput = z
  .object({
    explanation: z.string().min(1).max(2500),
    nextAction: z.string().min(1).max(400),
  })
  .strict();
