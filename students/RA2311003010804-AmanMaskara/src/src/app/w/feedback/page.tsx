import { getTranslations } from "next-intl/server";
import { Lock } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { feedbackHmacSecret } from "@/server/secrets";
import { hasAnsweredThisWeek } from "@/server/services/feedback";
import { issuesForWorker } from "@/server/services/issues";
import { SpeakButton } from "@/components/speak-button";
import { PageHeader } from "@/components/page-header";
import { SuccessCheck } from "@/components/success-check";
import { FeedbackForm } from "@/components/worker/feedback-form";
import { SiteIssues } from "@/components/worker/site-issues";
import { SpeakUpTabs } from "@/components/worker/speak-up-tabs";

export default async function FeedbackPage() {
  const session = await requireRole("worker");
  const t = await getTranslations("feedback");
  const repos = getRepos();
  const secret = feedbackHmacSecret();
  const [answered, issues] = await Promise.all([
    hasAnsweredThisWeek(repos, session.uid, new Date(), secret),
    session.siteId ? issuesForWorker(repos, session.siteId, session.uid, secret) : [],
  ]);
  // Never send signer keys or org ids to the browser: only what the card shows.
  const issueViews = issues.map(({ id, text, signerCount, status, response, signed, needed }) => ({
    id,
    text,
    signerCount,
    status,
    response,
    signed,
    needed,
  }));

  return (
    <div className="flex flex-col gap-4 md:mx-auto md:w-full md:max-w-3xl">
      <PageHeader title={t("title")} action={<SpeakButton text={`${t("title")}. ${t("anonymous")}`} />} />
      <p className="card flex items-center gap-3 p-4 font-bold">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-strong">
          <Lock aria-hidden="true" className="size-5" />
        </span>
        {t("anonymous")}
      </p>
      <SpeakUpTabs
        issueCount={issueViews.filter((i) => i.status !== "resolved").length}
        feel={
          answered ? (
            <div className="card flex flex-col items-center gap-3 px-5 py-8 text-center">
              <SuccessCheck className="size-16" />
              <p className="font-display text-2xl font-extrabold">{t("alreadyAnswered")}</p>
            </div>
          ) : (
            <FeedbackForm />
          )
        }
        issues={<SiteIssues issues={issueViews} />}
      />
    </div>
  );
}
