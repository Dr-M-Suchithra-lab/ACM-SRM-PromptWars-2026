import { z } from "zod";
import { policyInput } from "./engines.js";
export const id = z.string().uuid();
const text = (max = 100) => z.string().trim().min(1).max(max);
export const industry = z.enum([
  "construction",
  "healthcare",
  "manufacturing",
  "education",
  "other",
]);
export const businessInput = z
  .object({
    request_id: id,
    name: text(),
    industry,
    email: z.email().max(254),
    phone: z.string().trim().max(30).default(""),
    location: text(200),
    country: text(),
    state: text(),
    city: text(),
    description: z.string().trim().max(1000).default(""),
    size: z.number().int().min(1).max(1000000),
    working_days: z
      .array(z.number().int().min(0).max(6))
      .min(1)
      .max(7)
      .refine((v) => new Set(v).size === v.length),
    currency: z.literal("INR"),
    policy: policyInput.strict(),
  })
  .strict();
export const employeeInput = z
  .object({
    name: text(),
    email: z.email().max(254),
    phone: z.string().trim().max(30).default(""),
    employee_code: text(50),
    department: z.string().trim().max(100).default(""),
    job_title: z.string().trim().max(100).default(""),
    employment_type: z.enum(["full_time", "part_time", "contract"]),
    start_date: z.iso.date(),
    status: z.enum(["active", "inactive"]),
    rate_paise: z.number().int().positive().max(10000000),
    pay_basis: z.enum(["hourly", "daily"]),
    work_location: z.string().trim().max(200).default(""),
    skills: z.string().trim().max(500).default(""),
  })
  .strict();
export const settingsInput = businessInput
  .omit({ request_id: true, policy: true })
  .extend({
    departments: z.array(text()).max(100),
    work_locations: z.array(text(200)).max(100),
  })
  .strict();
export const tokenInput = z
  .object({ token: z.string().regex(/^[a-f0-9]{64}$/) })
  .strict();
export function safeAuthNext(value: string | null) {
  return value &&
    ["/onboarding", "/invite", "/reset-password", "/app/home"].includes(value)
    ? value
    : "/app/home";
}
export function passwordIssues(password: string) {
  return password.length < 12
    ? "Use at least 12 characters. A long, unique passphrase works well."
    : password.length > 128
      ? "Use no more than 128 characters."
      : "";
}
