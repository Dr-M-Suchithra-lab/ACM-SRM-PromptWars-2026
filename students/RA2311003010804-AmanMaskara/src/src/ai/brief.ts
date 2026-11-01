import "server-only";
import { z } from "zod";
import { getAiClient, MODELS, type AiClient } from "./client";
import { untrusted } from "./prompts";
import { describeAiError, logAiCall } from "./log";

/** Aggregates only: no names, no comments, no per-worker rows ever reach the model. */
export interface BriefInput {
  orgName: string;
  sector: string;
  workers: number;
  onSite: number;
  overtimeHours: number;
  openHazards: number;
  urgentHazards: number;
  fatigueBreaches: number;
  highRiskWorkers: number;
  moodAverage: number | null;
  topThemes: string[];
}

const Brief = z.object({ points: z.array(z.string().max(240)).min(2).max(5) });
const briefSchema = z.toJSONSchema(Brief);

/** Deterministic weekly summary used when Gemini is unavailable. */
export function templateBrief(input: BriefInput): string[] {
  const points = [
    `${input.onSite} of ${input.workers} workers are on site now; the team logged ${input.overtimeHours}h of overtime this week.`,
    `${input.openHazards} hazards are open, ${input.urgentHazards} of them high or critical.`,
  ];
  if (input.fatigueBreaches > 0)
    points.push(`${input.fatigueBreaches} workers broke a fatigue rule in the last 14 days — review rosters.`);
  if (input.moodAverage !== null) points.push(`Average feedback mood is ${input.moodAverage.toFixed(1)} / 3.`);
  if (input.topThemes.length) points.push(`Most mentioned in feedback: ${input.topThemes.join(", ")}.`);
  return points;
}

export async function weeklyBrief(
  input: BriefInput,
  client: AiClient | null = getAiClient(),
): Promise<{ points: string[]; source: "gemini" | "template" }> {
  if (client) {
    for (const [index, model] of [MODELS.fast, MODELS.fallback].entries()) {
      const started = Date.now();
      try {
        const raw = await client.generateText({
          model,
          system: [
            "You write a short weekly workforce-health brief for a site manager in India.",
            "Use only the numbers inside <untrusted>; never invent numbers. 3-5 bullet points, each with one concrete suggested action.",
            "Respond only with JSON matching the schema.",
          ].join("\n"),
          parts: [{ text: untrusted(JSON.stringify(input)) }],
          jsonSchema: briefSchema,
          temperature: 0.4,
        });
        const parsed = Brief.safeParse(JSON.parse(raw));
        await logAiCall({
          feature: "brief",
          model,
          latencyMs: Date.now() - started,
          fallbackUsed: index > 0,
          error: parsed.success ? undefined : "rejected: invalid JSON shape",
        });
        if (parsed.success) return { points: parsed.data.points, source: "gemini" };
      } catch (error) {
        await logAiCall({
          feature: "brief",
          model,
          latencyMs: Date.now() - started,
          fallbackUsed: true,
          error: describeAiError(error),
        });
      }
    }
  }
  return { points: templateBrief(input), source: "template" };
}
