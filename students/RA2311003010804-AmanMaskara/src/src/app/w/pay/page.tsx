import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CalendarDays, CircleCheck, FileClock } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { payCheckFor } from "@/server/services/pay-check";
import { findingSentences, payTemplate } from "@/server/pay-explain";
import { isActiveDispute } from "@/server/services/disputes";
import { isMonthKey, monthKey, payFocusMonth } from "@/core/period";
import { formatDuration, formatINR, formatMonth, formatRupees } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SpeakButton } from "@/components/speak-button";
import { PageHeader } from "@/components/page-header";
import { ExplainPay } from "@/components/worker/explain-pay";
import { ShortfallCard } from "@/components/worker/shortfall-card";
import { BankConfirmCard } from "@/components/worker/bank-confirm-card";
import { workerPayoutAccount } from "@/server/services/payouts";

export default async function PayPage({ searchParams }: PageProps<"/w/pay">) {
  const session = await requireRole("worker");
  const [t, locale] = await Promise.all([getTranslations("pay"), getLocale()]);
  const now = new Date();
  const months = [0, -1, -2].map((offset) => monthKey(now, offset));
  const requested = (await searchParams).m;
  const month =
    typeof requested === "string" && isMonthKey(requested) && months.includes(requested)
      ? requested
      : payFocusMonth(now);

  const repos = getRepos();
  const [check, disputes, bank, org] = await Promise.all([
    payCheckFor(repos, session.uid, month),
    repos.payDisputes.getByWorker(session.uid),
    workerPayoutAccount(repos, session.uid),
    repos.orgs.getById(session.orgId),
  ]);
  if (!check) return null;
  const { payslip, daysWorked } = check.view;
  const { sentences } = await payTemplate(check.view);
  const findings = check.result.findings;
  const dispute = disputes
    .filter((d) => d.month === month)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  const regular = payslip.lines.find((l) => l.kind === "regular");
  const overtime = payslip.lines.find((l) => l.kind === "overtime");
  const deducted = payslip.deductions.reduce((sum, d) => sum + d.amount, 0);
  const gross = Math.max(payslip.gross, 1);

  return (
    <div className="flex flex-col gap-5 md:mx-auto md:w-full md:max-w-3xl">
      <PageHeader title={t("title")} action={<SpeakButton text={sentences.join(" ")} />} />

      {/* Month tabs replace the URL: switching months never adds Back-button steps. */}
      <nav aria-label={t("period")} className="grid grid-cols-3 gap-1 rounded-full border border-line bg-surface p-1">
        {months.map((m) => (
          <Link
            key={m}
            href={`/w/pay?m=${m}`}
            replace
            scroll={false}
            aria-current={m === month ? "page" : undefined}
            className={cn(
              "flex min-h-12 items-center justify-center gap-1.5 rounded-full text-sm font-bold transition-colors",
              m === month ? "bg-primary text-on-primary" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
            )}
          >
            <CalendarDays aria-hidden="true" className="size-4" />
            {formatMonth(m, locale)}
          </Link>
        ))}
      </nav>

      {bank && <BankConfirmCard account={bank} employer={org?.name ?? ""} />}

      {check.outstanding > 0 ? (
        <ShortfallCard
          month={month}
          total={formatRupees(check.outstanding)}
          lines={await findingSentences(findings)}
          dispute={dispute ? { status: dispute.status, note: dispute.resolutionNote } : undefined}
          minimumWageNote={
            findings.some((f) => f.code === "BELOW_MINIMUM_WAGE")
              ? t("sentinel.minimumWageNote", { source: check.minimumWage.source })
              : undefined
          }
        />
      ) : check.arrearsPaid > 0 ? (
        // The employer paid the gap: the shortfall is gone, and the worker sees it was settled.
        <section
          aria-labelledby="arrears-title"
          className="card rise-in flex items-start gap-3 border-success/30 bg-success-soft p-5"
        >
          <CircleCheck aria-hidden="true" className="size-7 shrink-0 text-success" />
          <div>
            <h2 id="arrears-title" className="font-display text-xl font-extrabold">
              {t("sentinel.arrearsPaid", { amount: formatRupees(check.arrearsPaid) })}
            </h2>
            <p className="text-sm text-ink-2">{t("sentinel.arrearsHint")}</p>
          </div>
        </section>
      ) : (
        <p
          className={cn(
            "flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold",
            check.record ? "bg-success-soft text-success" : "bg-surface-2 text-ink-2",
          )}
        >
          {check.record ? (
            <CircleCheck aria-hidden="true" className="size-5" />
          ) : (
            <FileClock aria-hidden="true" className="size-5" />
          )}
          {check.record ? t("sentinel.matches") : t("sentinel.noRecord")}
        </p>
      )}
      {dispute && check.outstanding === 0 && !isActiveDispute(dispute) && dispute.resolutionNote && (
        <p className="card p-4 text-sm">{t("sentinel.employerReply", { note: dispute.resolutionNote })}</p>
      )}

      <section aria-labelledby="net-label" className="hero-card flex flex-col gap-5 p-5 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="net-label" className="eyebrow text-primary-strong">
            {t("net")}
          </h2>
          <span className="rounded-full bg-accent px-3 py-1 text-sm font-bold text-on-accent">
            {t("daysWorked", { days: daysWorked })}
          </span>
        </div>
        <p
          className="figure font-display text-[2.9rem] leading-none font-extrabold text-primary-strong md:text-7xl"
          data-testid="net-pay"
        >
          {formatINR(payslip.net)}
        </p>
        <div className="flex flex-col gap-2">
          <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-white/80" aria-hidden="true">
            <div
              className="meter-fill h-full bg-primary"
              style={{ width: `${((regular?.amount ?? 0) / gross) * 100}%` }}
            />
            {overtime && (
              <div className="meter-fill h-full bg-accent" style={{ width: `${(overtime.amount / gross) * 100}%` }} />
            )}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-primary" aria-hidden="true" />
              {t("regular")}
            </li>
            {overtime && (
              <li className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-accent" aria-hidden="true" />
                {t("overtime")}
              </li>
            )}
            {deducted > 0 && <li>{payslip.deductions.map((d) => t(`deduction.${d.label}`)).join(", ")}</li>}
          </ul>
        </div>
      </section>

      <section className="receipt card rounded-b-none px-5 pt-3 pb-5">
        <dl className="divide-y divide-line">
          <div className="flex items-center justify-between gap-2 py-3.5">
            <dt>
              <span className="font-bold">{t("regular")}</span>
              <span className="figure block text-sm text-ink-2">{formatDuration(regular?.minutes ?? 0)}</span>
            </dt>
            <dd className="figure font-bold whitespace-nowrap">{formatINR(regular?.amount ?? 0)}</dd>
          </div>
          {overtime && (
            <div className="flex items-center justify-between gap-2 py-3.5" data-testid="overtime-line">
              <dt>
                <span className="flex flex-wrap items-center gap-2 font-bold">
                  {t("overtime")} <Badge tone="signal">{t("doubleRate")}</Badge>
                </span>
                <span className="block text-sm text-ink-2">
                  <span className="figure">{formatDuration(overtime.minutes ?? 0)}</span> ·{" "}
                  {t(`basis.${payslip.overtimeBasis}`)}
                </span>
              </dt>
              <dd className="figure font-bold whitespace-nowrap">{formatINR(overtime.amount)}</dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-2 py-3.5">
            <dt className="font-extrabold">{t("gross")}</dt>
            <dd className="figure font-bold whitespace-nowrap">{formatINR(payslip.gross)}</dd>
          </div>
          {payslip.deductions.map((d) => (
            <div key={d.label} className="flex items-center justify-between gap-2 py-3.5">
              <dt>{t(`deduction.${d.label}`)}</dt>
              <dd className="figure font-bold whitespace-nowrap">− {formatINR(d.amount)}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-2 pt-4">
            <dt className="font-display text-lg font-extrabold">{t("net")}</dt>
            <dd className="figure text-xl font-bold whitespace-nowrap">{formatINR(payslip.net)}</dd>
          </div>
        </dl>
      </section>

      <div className="mt-3">
        <ExplainPay month={month} sentences={sentences} />
      </div>
    </div>
  );
}
