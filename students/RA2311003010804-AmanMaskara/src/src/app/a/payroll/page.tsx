import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Download } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { buildPayroll } from "@/server/services/payroll";
import { isMonthKey, monthKey, payFocusMonth } from "@/core/period";
import { formatMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { DisputeList } from "@/components/admin/dispute-list";
import { PaidRecordTools } from "@/components/admin/paid-records";
import { PayrollTable } from "@/components/admin/payroll-table";

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
  const [rows, disputes] = await Promise.all([
    buildPayroll(repos, session.orgId, month),
    repos.payDisputes.getByOrg(session.orgId),
  ]);
  const flagged = rows.filter((r) => r.outstanding > 0);

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

      <section aria-labelledby="sentinel-title" className="hero-card flex flex-col gap-3 p-5">
        <h2 id="sentinel-title" className="font-display text-xl font-extrabold">
          {t("sentinel.title")}
        </h2>
        <p className="text-ink-2">{t("sentinel.hint")}</p>
        <p className="font-bold">
          {flagged.length ? t("sentinel.flagged", { count: flagged.length }) : t("sentinel.clear")}
        </p>
        <PaidRecordTools
          month={month}
          workers={rows.map((r) => ({
            id: r.workerId,
            label: `${r.name} (#${r.code})`,
            regularMinutes: r.regularMinutes,
            overtimeMinutes: r.overtimeMinutes,
            rates: r.rates,
            gross: r.gross,
            deductions: r.deductions,
          }))}
        />
        <p className="text-xs text-ink-2">{t("sentinel.minimumWageNote")}</p>
      </section>

      <PayrollTable rows={rows} month={month} />

      <DisputeList disputes={disputes} nameOf={new Map(rows.map((r) => [r.workerId, r.name]))} />
    </div>
  );
}
