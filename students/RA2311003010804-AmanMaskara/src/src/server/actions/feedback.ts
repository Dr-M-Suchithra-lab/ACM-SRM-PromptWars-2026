"use server";

import { z } from "zod";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { feedbackHmacSecret } from "@/server/secrets";
import { submitFeedback } from "@/server/services/feedback";

const Score = z.number().int().min(1).max(3);
const FeedbackInput = z.object({
  pay: Score,
  safety: Score,
  respect: Score,
  comment: z.string().max(500).optional(),
});

export async function submitFeedbackAction(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireRole("worker");
  const parsed = FeedbackInput.safeParse(input);
  if (!parsed.success || !session.siteId) return { ok: false, error: "invalid" };
  const { comment, ...scores } = parsed.data;
  const result = await submitFeedback(getRepos(), {
    workerId: session.uid,
    orgId: session.orgId,
    siteId: session.siteId,
    scores,
    comment,
    now: new Date(),
    hmacSecret: feedbackHmacSecret(),
  });
  return result;
}
