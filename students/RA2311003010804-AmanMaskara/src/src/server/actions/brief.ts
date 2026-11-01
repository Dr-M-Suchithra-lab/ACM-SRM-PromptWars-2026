"use server";

import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { RateLimiter } from "@/server/rate-limit";
import { buildOrgSnapshot } from "@/server/services/workforce";
import { countThemes, THEMES } from "@/core/themes";
import { weeklyBrief } from "@/ai/brief";

const limiter = new RateLimiter({ maxTokens: 5, refillIntervalMs: 60_000 });

export async function weeklyBriefAction(): Promise<{ points: string[]; source: "gemini" | "template" } | null> {
  const session = await requireRole("admin");
  if (!limiter.check(session.uid)) return null;
  const snapshot = await buildOrgSnapshot(getRepos(), session.orgId, new Date());
  if (!snapshot) return null;

  const open = snapshot.hazards.filter((h) => h.status === "received" || h.status === "in_progress");
  const themes = countThemes(snapshot.feedback.flatMap((f) => (f.comment ? [f.comment] : [])));
  return weeklyBrief({
    orgName: snapshot.org.name,
    sector: snapshot.org.sector,
    workers: snapshot.workers.length,
    onSite: snapshot.workers.filter((w) => w.onSite).length,
    overtimeHours: Math.round(snapshot.workers.reduce((s, w) => s + w.overtimeThisWeek, 0) / 6) / 10,
    openHazards: open.length,
    urgentHazards: open.filter((h) => h.severity === "high" || h.severity === "critical").length,
    fatigueBreaches: snapshot.workers.filter((w) => w.fatigue.length > 0).length,
    highRiskWorkers: snapshot.workers.filter((w) => w.risk.score >= 40).length,
    moodAverage: snapshot.moodAverage,
    topThemes: THEMES.filter((t) => themes[t] > 0)
      .sort((a, b) => themes[b] - themes[a])
      .slice(0, 3),
  });
}
