import { getTranslations } from "next-intl/server";
import { Building } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { buildOrgSnapshot } from "@/server/services/workforce";
import { certificateCandidates } from "@/server/services/benefits";
import { pendingSkills } from "@/server/services/skills";
import { Badge } from "@/components/ui/badge";
import { RiskReasons, riskTone } from "@/components/admin/reason-chips";
import { CertificateApprovals } from "@/components/admin/certificates";
import { PeopleList } from "@/components/admin/people-list";
import { SkillQueue } from "@/components/admin/skill-queue";
import { PageHeader } from "@/components/page-header";

export default async function PeoplePage() {
  const session = await requireRole("admin");
  const t = await getTranslations("admin.peoplePage");
  const repos = getRepos();
  const now = new Date();
  const [snapshot, sites, candidates, skillQueue] = await Promise.all([
    buildOrgSnapshot(repos, session.orgId, now),
    repos.sites.getByOrg(session.orgId),
    certificateCandidates(repos, session.orgId, now),
    pendingSkills(repos, session.orgId),
  ]);
  if (!snapshot) return null;
  const siteOf = new Map(sites.map((s) => [s.id, s.name]));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("title")}>{t("intro")}</PageHeader>

      <section aria-labelledby="site-context" className="flex flex-col gap-3">
        <h2 id="site-context" className="font-display text-xl font-extrabold">
          {t("siteContext")}
        </h2>
        <p className="text-sm text-ink-2">{t("siteContextHint")}</p>
        <ul className="grid gap-3 md:grid-cols-2">
          {snapshot.sites.map(({ siteId, risk }) => (
            <li key={siteId} className="card flex flex-col gap-2 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 font-bold">
                  <Building aria-hidden="true" className="size-4 text-primary" />
                  {siteOf.get(siteId)}
                </p>
                <Badge tone={riskTone(risk.score)}>{t("siteScore", { score: risk.score })}</Badge>
              </div>
              <RiskReasons risk={risk} />
            </li>
          ))}
        </ul>
      </section>

      <SkillQueue queue={skillQueue} workers={snapshot.workers.map((w) => w.worker)} />

      {/* Only requests need a decision up top; everyone's progress sits with their row below. */}
      <CertificateApprovals approvals={candidates.filter((c) => c.request?.status === "requested")} />

      <PeopleList workers={snapshot.workers} siteOf={siteOf} certsOf={Map.groupBy(candidates, (c) => c.worker.id)} />
      <p className="text-sm text-ink-2">{t("method")}</p>
    </div>
  );
}
