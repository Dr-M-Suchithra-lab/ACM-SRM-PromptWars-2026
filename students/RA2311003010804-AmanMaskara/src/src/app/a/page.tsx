import { getLocale, getTranslations } from "next-intl/server";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { buildOrgSnapshot, shortDay } from "@/server/services/workforce";
import { isActiveDispute } from "@/server/services/disputes";
import { issuesForAdmin } from "@/server/services/issues";
import { recentAiCalls } from "@/ai/log";
import { hasGemini } from "@/ai/client";
import { ESCALATION_CHAINS } from "@/config/hazard-sla";
import { isOpen } from "@/core/hazard-lifecycle";
import { PageHeader, todayLabel } from "@/components/page-header";
import { AiPanel } from "@/components/admin/ai-panel";
import { AttentionList, type AttentionItems } from "@/components/admin/attention-list";
import { BarChartCard } from "@/components/admin/bar-chart-card";
import { OverviewKpis } from "@/components/admin/overview-kpis";
import { WelcomeMoment } from "@/components/welcome/welcome";
import { dayPart, istHour } from "@/lib/day-part";

const RISK_ATTENTION = 40;
const URGENT = new Set(["critical", "high"]);

export default async function AdminOverview({ searchParams }: PageProps<"/a">) {
  const session = await requireRole("admin");
  const [t, locale, params] = await Promise.all([getTranslations("admin"), getLocale(), searchParams]);
  const repos = getRepos();
  const now = new Date();
  const [snapshot, admin, disputes, issues, certificates, aiCalls] = await Promise.all([
    buildOrgSnapshot(repos, session.orgId, now),
    repos.admins.getById(session.uid),
    repos.payDisputes.getByOrg(session.orgId),
    issuesForAdmin(repos, session.orgId),
    repos.certificates.getByOrg(session.orgId),
    recentAiCalls(5),
  ]);
  if (!snapshot) return null;
  const { workers, hazards, feedback } = snapshot;
  const nameOf = new Map(workers.map((w) => [w.worker.id, w.worker.name]));

  const open = hazards.filter(isOpen);
  // Escalated first (highest level, then oldest), then other urgent ones.
  const escalated = open
    .filter((h) => h.escalationLevel > 0)
    .sort((a, b) => b.escalationLevel - a.escalationLevel || a.createdAt.getTime() - b.createdAt.getTime());
  const urgent = open.filter((h) => h.escalationLevel === 0 && URGENT.has(h.severity));
  const tired = workers.filter((w) => w.fatigue.length > 0);
  const attention: AttentionItems = {
    hazards: [...escalated, ...urgent],
    disputes: disputes.filter(isActiveDispute),
    issues: issues.filter((i) => i.status === "escalated"),
    certificates: certificates.filter((c) => c.status === "requested"),
    tired,
    atRisk: workers.filter((w) => w.risk.score >= RISK_ATTENTION),
  };
  const attentionCount = Object.values(attention).reduce((sum, items) => sum + items.length, 0);

  const firstName = admin?.name.replace(/^Dr\.\s*/, "").split(" ")[0] ?? "";
  const part = dayPart(istHour(now));
  const greeting = t(`welcome.${part}`, { name: firstName });

  return (
    <WelcomeMoment
      active={params.welcome === "1"}
      variant="admin"
      part={part}
      greeting={greeting}
      line={t("welcome.attention", { count: attentionCount })}
    >
      <div className="flex flex-col gap-6">
        <PageHeader eyebrow={todayLabel(locale)} title={t("overview")} />

        <OverviewKpis
          onSite={workers.filter((w) => w.onSite).length}
          workerCount={workers.length}
          overtimeMinutes={workers.reduce((sum, w) => sum + w.overtimeThisWeek, 0)}
          openHazards={open.length}
          escalatedHazards={escalated.length}
          moodAverage={snapshot.moodAverage}
          responses={feedback.length}
          tired={tired.length}
        />

        <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
          <AttentionList
            items={attention}
            count={attentionCount}
            nameOf={nameOf}
            chain={ESCALATION_CHAINS[snapshot.org.sector]}
            now={now}
          />
          <AiPanel configured={hasGemini()} calls={aiCalls} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <BarChartCard
            title={t("charts.attendance")}
            unit={t("charts.workersUnit")}
            tableLabel={t("charts.attendance")}
            data={snapshot.attendanceByDay.map((d) => ({ label: shortDay(d.day), value: d.present }))}
          />
          <BarChartCard
            title={t("charts.overtime")}
            unit={t("charts.hoursUnit")}
            tableLabel={t("charts.overtime")}
            data={snapshot.overtimeByWeek.map((w) => ({ label: w.week.slice(5), value: w.hours }))}
          />
        </div>
      </div>
    </WelcomeMoment>
  );
}
