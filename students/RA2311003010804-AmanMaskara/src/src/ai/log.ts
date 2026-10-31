import "server-only";
import { getRepos } from "@/server/repos";
import type { AiLogEntry } from "@/server/repos/types";

export type { AiLogEntry };

const MAX_ERROR_LENGTH = 120;

/** A short, content-free description of why a call failed (status / error class only). */
export function describeAiError(error: unknown): string {
  if (error instanceof Error) {
    const status = (error as Error & { status?: number }).status;
    return `${status ? `${status} ` : ""}${error.name}: ${error.message}`.slice(0, MAX_ERROR_LENGTH);
  }
  return "unknown error";
}

/**
 * Records metadata about an AI call for the admin transparency panel, in the database so it
 * survives serverless / Cloud Run instance restarts. Never stores prompts or outputs.
 * Failures are also written to the server log so a broken key or model id is visible.
 */
export async function logAiCall(entry: Omit<AiLogEntry, "at">): Promise<void> {
  if (entry.error) console.error(`[FairShift AI] ${entry.feature} via ${entry.model} failed: ${entry.error}`);
  try {
    await getRepos().aiLog.add({ ...entry, at: new Date() });
  } catch (error) {
    console.error("[FairShift AI] could not persist the AI log:", describeAiError(error));
  }
}

export function recentAiCalls(limit = 5): Promise<AiLogEntry[]> {
  return getRepos().aiLog.recent(limit);
}
