import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Download } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { buildPayroll } from "@/server/services/payroll";
import { buildLedger } from "@/server/services/payroll-ledger";
import { payoutOverview } from "@/server/services/payouts";
import { getCheckoutProvider } from "@/server/payouts/provider";
import { isMonthKey, monthKey, payFocusMonth } from "@/core/period";
import { formatMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { DisputeList } from "@/components/admin/dispute-list";
import { PayrollSummary } from "@/components/admin/payroll/summary";
import { PayrollLedger } from "@/components/admin/payroll/ledger";
import { CheckoutHistory, WaitingCheckouts } from "@/components/admin/payroll/checkouts";

/**
 * Payroll in one flow: the month at a glance, any checkout still waiting to be paid, then every
 * worker with their pay, FairPay Sentinel's check and bank account (tick to pay in one checkout),
 * then past checkouts and pay reviews.
 */
export default async function PayrollPage({ searchParams }: PageProps<"/a/payroll">) {
  const session = await requireRole("admin");
  const [t, locale] = await Promise.all([getTranslations("admin.payrollPage"), getLocale()]);
  const now = new Date();
  const months = [0, -1, -2].map((offset) => monthKey(now, offset));
  const requested = (await searchParams).m;
  const month =
    typeof requested === "string" && isMonthKey(requested) && months.includes(requested)
      ? requested
      : payFocusMonth(now);
  const repos = getRepos();
  const payroll = buildPayroll(repos, session.orgId, month);
  const [rows, disputes, payouts] = await Promise.all([
    payroll,
    repos.payDisputes.getByOrg(session.orgId),
    payoutOverview(repos, session.orgId, month, payroll),
  ]);
  const ledger = buildLedger(rows, payouts);
  const provider = getCheckoutProvider()?.name ?? null;
  const waiting = payouts.batches.filter((b) => b.summary.pending > 0);
  const finished = payouts.batches.filter((b) => b.summary.pending === 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("title")}
        action={
          <a href={`/api/payroll?month=${month}`} className={buttonVariants({ size: "md" })} download>
            <Download aria-hidden="true" className="size-4" />
            {t("export")}
          </a>
        }
      >
        {t("intro")}
      </PageHeader>

      <nav
        aria-label={t("month")}
        className="flex w-fit flex-wrap gap-1 rounded-full border border-line bg-surface p-1"
      >
        {months.map((m) => (
          <Link
            key={m}
            href={`/a/payroll?m=${m}`}
            replace
            scroll={false}
            aria-current={m === month ? "page" : undefined}
            className={cn(
              buttonVariants({ size: "sm", variant: m === month ? "primary" : "ghost" }),
              m !== month && "text-ink-2",
            )}
          >
            {formatMonth(m, locale)}
          </Link>
        ))}
      </nav>

      <PayrollSummary summary={ledger.summary} />

      <WaitingCheckouts batches={waiting} enabled={provider !== null} />

      <PayrollLedger month={month} provider={provider} rows={ledger.rows} />

      <CheckoutHistory batches={finished} />

      <DisputeList disputes={disputes} nameOf={new Map(rows.map((r) => [r.workerId, r.name]))} />
    </div>
  );
}
