import { getTranslations } from "next-intl/server";
import { Lock, Megaphone } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { gateByCohort, K_ANONYMITY } from "@/core/anonymity";
import { countThemes, THEMES } from "@/core/themes";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { WeeklyBrief } from "@/components/admin/weekly-brief";
import { IssueResponse } from "@/components/admin/issue-response";
import { issuesForAdmin } from "@/server/services/issues";
import { PageHeader } from "@/components/page-header";

const QUESTIONS = ["pay", "safety", "respect"] as const;

function avg(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export default async function FeedbackAdminPage() {
  const session = await requireRole("admin");
  const t = await getTranslations("admin.feedbackPage");
  const repos = getRepos();
  const [feedback, sites, issues] = await Promise.all([
    repos.feedback.getByOrg(session.orgId),
    repos.sites.getByOrg(session.orgId),
    issuesForAdmin(repos, session.orgId),
  ]);
  const siteOf = new Map(sites.map((s) => [s.id, s.name]));

  // One group per site and week; groups below k are summarised as a count only.
  const groups = [...gateByCohort(feedback, (f) => `${f.siteId}|${f.weekBucket}`).entries()].sort(([a], [b]) =>
    b.localeCompare(a),
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")}>
        <span className="flex items-center gap-2">
          <Lock aria-hidden="true" className="size-4 shrink-0" />
          {t("privacy", { k: K_ANONYMITY })}
        </span>
      </PageHeader>

      <WeeklyBrief />

      <section id="issues" aria-labelledby="issues-title" className="flex scroll-mt-24 flex-col gap-3">
        <h2 id="issues-title" className="font-display text-xl font-extrabold">
          {t("issues.title")}
        </h2>
        <p className="text-sm text-ink-2">{t("issues.hint", { k: K_ANONYMITY })}</p>
        {issues.length === 0 ? (
          <p className="text-ink-2">{t("issues.none")}</p>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {issues.map((issue) => (
              <li key={issue.id} className="card flex flex-col gap-3 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-info-soft text-[#2558b5]">
                    <Megaphone aria-hidden="true" className="size-5" />
                  </span>
                  <div className="flex-1">
                    <p className="font-bold">{issue.text}</p>
                    <p className="text-sm text-ink-2">
                      {siteOf.get(issue.siteId)} · {t("issues.signers", { count: issue.signerCount })}
                    </p>
                  </div>
                  <Badge
                    tone={
                      issue.status === "resolved" ? "success" : issue.status === "acknowledged" ? "info" : "warning"
                    }
                  >
                    {t(`issues.status.${issue.status}`)}
                  </Badge>
                </div>
                {issue.response && <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm">{issue.response}</p>}
                <IssueResponse issueId={issue.id} status={issue.status} response={issue.response} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <ul className="grid gap-4 lg:grid-cols-2">
        {groups.map(([key, gate]) => {
          const [siteId, week] = key.split("|");
          return (
            <li key={key}>
              <Card className="flex h-full flex-col gap-3 p-4 md:p-5">
                <h2 className="font-display flex items-center justify-between gap-2 text-lg font-extrabold">
                  {siteOf.get(siteId)}
                  <Badge>{week}</Badge>
                </h2>
                {!gate.visible ? (
                  <p className="text-ink-2">{t("hidden", { count: gate.count, k: gate.needed })}</p>
                ) : (
                  <>
                    <dl className="grid grid-cols-3 gap-2 text-center">
                      {QUESTIONS.map((q) => {
                        const score = avg(gate.items.map((f) => f.scores[q]));
                        return (
                          <div key={q} className="rounded-2xl bg-surface-2 p-3">
                            <dt className="text-sm text-ink-2">{t(`q.${q}`)}</dt>
                            <dd className="figure text-2xl font-bold">
                              {score.toFixed(1)}
                              <span className="text-sm font-normal text-ink-2"> / 3</span>
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                    <p className="text-sm text-ink-2">{t("responses", { count: gate.count })}</p>
                    <Themes
                      comments={gate.items.flatMap((f) => (f.comment ? [f.comment] : []))}
                      label={t("themes")}
                      themeLabel={(theme) => t(`theme.${theme}`)}
                    />
                    <ul className="flex flex-col gap-1 text-sm">
                      {gate.items
                        .filter((f) => f.comment)
                        .map((f) => (
                          <li key={f.id} className="rounded-xl border border-line p-2">
                            “{f.comment}”
                          </li>
                        ))}
                    </ul>
                  </>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Themes({
  comments,
  label,
  themeLabel,
}: {
  comments: string[];
  label: string;
  themeLabel: (theme: string) => string;
}) {
  const counts = countThemes(comments);
  const present = THEMES.filter((theme) => counts[theme] > 0);
  if (present.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 text-sm">
      <span className="font-semibold">{label}:</span>
      {present.map((theme) => (
        <Badge key={theme} tone="brand">
          {themeLabel(theme)} · {counts[theme]}
        </Badge>
      ))}
    </div>
  );
}
