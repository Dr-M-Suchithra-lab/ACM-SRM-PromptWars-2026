import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck } from "lucide-react";
import { getRepos } from "@/server/repos";
import { readCertificateToken } from "@/server/passport";
import { currentOrigin } from "@/server/origin";
import { getScheme } from "@/config/schemes";
import type { Locale } from "@/i18n/locales";
import { formatDay } from "@/lib/format";
import { PublicShell } from "@/components/public-shell";
import { PrintButton } from "@/components/print-button";
import { VerificationError } from "@/components/verification-error";

export const metadata: Metadata = { title: "Work certificate", robots: { index: false } };

/**
 * Employer-signed certificate of days worked (e.g. the 90-day certificate for the construction
 * welfare board). The URL is HMAC-signed; the QR points back here so an officer can verify it.
 */
export default async function CertificatePage({ params }: PageProps<"/certificate/[token]">) {
  const { token } = await params;
  const claims = readCertificateToken(token, new Date());
  if (!claims.ok) return <VerificationError kind="certificate" reason="invalid" />;

  const repos = getRepos();
  const request = await repos.certificates.getById(claims.certificateId);
  if (!request || request.status !== "approved") return <VerificationError kind="certificate" reason="invalid" />;
  const [worker, org, approver, t, locale, origin] = await Promise.all([
    repos.workers.getById(request.workerId),
    repos.orgs.getById(request.orgId),
    request.decidedBy ? repos.admins.getById(request.decidedBy) : undefined,
    getTranslations("certificate"),
    getLocale() as Promise<Locale>,
    currentOrigin(),
  ]);
  if (!worker || !org) return <VerificationError kind="certificate" reason="invalid" />;
  const scheme = getScheme(request.schemeId);
  const issued = request.decidedAt ?? request.requestedAt;

  return (
    <PublicShell wide>
      <article className="card flex flex-col gap-5 p-6 md:p-8 print:border-0 print:shadow-none">
        <div className="hazard-tape" aria-hidden="true" />
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{scheme?.name[locale]}</p>
            <h1 className="font-display text-3xl leading-tight font-extrabold">{t("title")}</h1>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-sm font-bold text-success">
            <ShieldCheck aria-hidden="true" className="size-4" />
            {t("verified")}
          </span>
        </header>
        <p className="text-lg leading-relaxed">
          {t("body", {
            name: worker.name,
            role: worker.jobTitle,
            org: org.name,
            days: request.daysWorked,
            from: formatDay(request.from, locale),
            to: formatDay(request.to, locale),
          })}
        </p>
        <dl className="grid gap-3 sm:grid-cols-2">
          {[
            [t("worker"), worker.name],
            [t("employer"), org.name],
            [t("daysWorked"), String(request.daysWorked)],
            [t("period"), `${formatDay(request.from, locale)} – ${formatDay(request.to, locale)}`],
            [t("issued"), formatDay(issued.toISOString().slice(0, 10), locale)],
            [t("approvedBy"), approver?.name ?? org.name],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-surface-2/70 p-3">
              <dt className="eyebrow">{label}</dt>
              <dd className="figure font-bold">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-white p-2 ring-1 ring-line">
            <QRCodeSVG value={`${origin}/certificate/${token}`} size={112} title={t("qrLabel")} />
          </div>
          <p className="text-sm text-ink-2">{t("verifyHint")}</p>
        </div>
      </article>
      <PrintButton />
    </PublicShell>
  );
}
