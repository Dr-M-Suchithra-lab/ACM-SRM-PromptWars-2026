import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CircleCheck, CircleX, FlaskConical } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { getCheckoutProvider } from "@/server/payouts/provider";
import { waitingCheckout } from "@/server/services/payouts";
import { completeSimulatedCheckoutAction } from "@/server/actions/payouts";
import { formatINR } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/ui/submit-button";

/**
 * Stand-in for Cashfree's hosted checkout when no test keys are set. With keys, the employer is
 * sent to Cashfree instead and this page is never used. It never asks for bank or card details.
 */
export default async function SimulatedCheckoutPage({ params }: PageProps<"/a/payroll/checkout/[batchId]">) {
  const session = await requireRole("admin");
  if (getCheckoutProvider()?.name !== "simulated") notFound();
  const { batchId } = await params;
  const batch = await waitingCheckout(getRepos(), session.orgId, batchId);
  if (!batch || batch.provider !== "simulated") redirect("/a/payroll");
  const t = await getTranslations("admin.payrollPage.payouts.simulated");
  const total = batch.items.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")}>
        {t("intro")}
      </PageHeader>

      <Card className="flex flex-col gap-4 p-5">
        <p className="flex items-center gap-2 rounded-2xl bg-warning-soft px-3 py-2 text-sm font-semibold text-warning-ink">
          <FlaskConical aria-hidden="true" className="size-5 shrink-0" />
          {t("notice")}
        </p>
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-bold">{t("total")}</span>
          <span className="figure text-3xl font-extrabold">{formatINR(total)}</span>
        </div>
        <div>
          <h2 className="eyebrow mb-2">{t("splitTitle")}</h2>
          <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line">
            {batch.items.map((item) => (
              <li key={item.transferId} className="flex items-center justify-between gap-3 px-3 py-2">
                <span>
                  <span className="font-bold">{item.name}</span>{" "}
                  <span className="text-sm text-ink-2">
                    {item.accountMasked} · {item.ifsc}
                  </span>
                </span>
                <span className="figure font-semibold">{formatINR(item.amount)}</span>
              </li>
            ))}
          </ul>
        </div>

        <form action={completeSimulatedCheckoutAction} className="flex flex-col gap-2">
          <input type="hidden" name="batchId" value={batch.id} />
          <SubmitButton size="lg" name="outcome" value="paid">
            <CircleCheck aria-hidden="true" className="size-5" />
            {t("pay", { amount: formatINR(total) })}
          </SubmitButton>
          <SubmitButton size="lg" variant="outline" name="outcome" value="failed">
            <CircleX aria-hidden="true" className="size-5" />
            {t("fail")}
          </SubmitButton>
        </form>
        <Link href="/a/payroll" className={buttonVariants({ variant: "ghost" })}>
          {t("back")}
        </Link>
      </Card>
    </div>
  );
}
