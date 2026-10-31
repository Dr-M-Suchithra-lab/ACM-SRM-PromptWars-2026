import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { BadgeCheck, CalendarCheck } from "lucide-react";
import { getRepos } from "@/server/repos";
import { readPassportToken } from "@/server/passport";
import { passportData } from "@/server/services/passport";
import { sharedSections } from "@/core/work-history";
import { formatDay, formatDuration } from "@/lib/format";
import { PublicShell } from "@/components/public-shell";
import { VerificationError } from "@/components/verification-error";
import { WorkHistoryList } from "@/components/work-history";

export const metadata: Metadata = { title: "Skill passport", robots: { index: false } };

/**
 * Public, read-only skill passport for a future employer. Shows first name + initial and only
 * the sections the worker chose; verified skills only. The link is signed and expires.
 */
export default async function PassportPage({ params }: PageProps<"/passport/[token]">) {
  const { token } = await params;
  const claims = readPassportToken(token, new Date());
  if (!claims.ok)
    return <VerificationError kind="passport" reason={claims.reason === "expired" ? "expired" : "invalid"} />;
  const [data, t, locale] = await Promise.all([
    passportData(getRepos(), claims.workerId),
    getTranslations("passport"),
    getLocale(),
  ]);
  if (!data) return <VerificationError kind="passport" reason="invalid" />;

  const [first, last] = data.worker.name.split(" ");
  const verifiedSkills = data.skills.filter((s) => s.verifiedBy);
  const sections = sharedSections(verifiedSkills, data.history, claims.share);
  const day = (date: Date) => formatDay(date.toISOString().slice(0, 10), locale);

  return (
    <PublicShell wide>
      <section className="hero-card flex flex-col gap-2 p-6">
        <BadgeCheck aria-hidden="true" className="size-9 text-primary" />
        <h1 className="font-display text-3xl leading-tight font-extrabold">
          {t("passportOf", { name: `${first} ${last?.[0] ?? ""}.` })}
        </h1>
        <p className="text-ink-2">
          {data.worker.jobTitle} · {t("issuedBy", { org: data.org.name })}
        </p>
        <p className="figure flex items-center gap-2 text-sm font-semibold">
          <CalendarCheck aria-hidden="true" className="size-4 text-primary" />
          {t("validity", { issued: day(claims.issuedAt), until: day(claims.expiresAt) })}
        </p>
      </section>

      {sections.totals && (
        <dl className="grid grid-cols-2 gap-3">
          <div className="card p-4">
            <dt className="eyebrow">{t("totalDays")}</dt>
            <dd className="figure text-3xl font-extrabold">{sections.totals.days}</dd>
          </div>
          <div className="card p-4">
            <dt className="eyebrow">{t("totalHours")}</dt>
            <dd className="figure text-3xl font-extrabold">{formatDuration(sections.totals.minutes)}</dd>
          </div>
        </dl>
      )}

      {sections.history && (
        <section aria-labelledby="history" className="flex flex-col gap-3">
          <h2 id="history" className="font-display text-2xl font-extrabold">
            {t("historyTitle")}
          </h2>
          <WorkHistoryList entries={sections.history} showHours={claims.share.hours} locale={locale} />
        </section>
      )}

      {sections.skills && (
        <section aria-labelledby="skills" className="flex flex-col gap-3">
          <h2 id="skills" className="font-display text-2xl font-extrabold">
            {t("skillsTitle")}
          </h2>
          <ul className="stagger flex flex-col gap-2.5">
            {sections.skills.map((skill) => (
              <li key={skill.id} className="card flex items-center gap-3 p-4">
                <span
                  aria-hidden="true"
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-success text-white"
                >
                  <BadgeCheck className="size-6" />
                </span>
                <div>
                  <p className="font-bold">{skill.title}</p>
                  <p className="text-sm text-ink-2">{skill.issuer}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </PublicShell>
  );
}
