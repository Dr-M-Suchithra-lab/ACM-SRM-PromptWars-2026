"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CircleCheck, CircleX, Clock, ExternalLink, History, RefreshCw, X } from "lucide-react";
import type { PayoutBatchView } from "@/server/services/payouts";
import { cancelCheckoutAction, confirmCheckoutAction } from "@/server/actions/payouts";
import { formatINR, formatWhen } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";

const total = (batch: PayoutBatchView) => batch.items.reduce((sum, i) => sum + i.amount, 0);

/** Checkouts opened but not paid yet: pay, check with the provider, or cancel to free the workers. */
export function WaitingCheckouts({ batches, enabled }: { batches: PayoutBatchView[]; enabled: boolean }) {
  const t = useTranslations("admin.payrollPage");
  const locale = useLocale();
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState(false);
  if (batches.length === 0) return null;

  function run(action: typeof confirmCheckoutAction, batchId: string) {
    setError(false);
    startTransition(async () => {
      const result = await action({ batchId });
      if (!result.ok) setError(true);
      router.refresh();
    });
  }

  return (
    <section
      aria-labelledby="waiting-title"
      className="flex flex-col gap-3 rounded-3xl border border-warning/40 bg-warning-soft p-4"
    >
      <h2 id="waiting-title" className="flex items-center gap-2 font-display text-lg font-extrabold">
        <Clock aria-hidden="true" className="size-5" />
        {t("checkouts.waitingTitle")}
      </h2>
      <ul className="flex flex-col gap-3">
        {batches.map((batch) => (
          <li key={batch.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface p-3">
            <p className="min-w-0 flex-1 basis-64 text-sm">
              <span className="font-bold">{formatWhen(batch.createdAt, locale)}</span> ·{" "}
              {batch.items.map((i) => i.name).join(", ")} ·{" "}
              <span className="figure font-semibold">{formatINR(total(batch))}</span>
            </p>
            {enabled && (
              <span className="flex flex-wrap gap-2">
                {batch.checkoutUrl && (
                  <a href={batch.checkoutUrl} className={buttonVariants({ size: "sm" })}>
                    <ExternalLink aria-hidden="true" className="size-4" />
                    {t("payouts.continueCheckout")}
                  </a>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => run(confirmCheckoutAction, batch.id)}
                  disabled={busy}
                >
                  <RefreshCw aria-hidden="true" className={cn("size-4", busy && "animate-spin")} />
                  {t("payouts.checkStatus")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => run(cancelCheckoutAction, batch.id)} disabled={busy}>
                  <X aria-hidden="true" className="size-4" />
                  {t("payouts.cancel")}
                </Button>
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="text-sm text-warning-ink">{t("checkouts.stuck")}</p>
      {error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {t("payouts.errors.unavailable")}
        </p>
      )}
    </section>
  );
}

/** Finished checkouts, folded away: who was paid in each, or why it wasn't. */
export function CheckoutHistory({ batches }: { batches: PayoutBatchView[] }) {
  const t = useTranslations("admin.payrollPage");
  const locale = useLocale();
  if (batches.length === 0) return null;

  return (
    <details className="group card p-4">
      <summary className="flex min-h-10 cursor-pointer items-center gap-2 font-bold">
        <History aria-hidden="true" className="size-5 text-primary" />
        {t("checkouts.history", { count: batches.length })}
      </summary>
      <ul className="mt-3 flex flex-col gap-3">
        {batches.map((batch) => (
          <li key={batch.id} className="flex flex-col gap-1.5 border-t border-line pt-3">
            <p className="text-sm">
              <span className="font-bold">{formatWhen(batch.createdAt, locale)}</span> ·{" "}
              {t("payouts.batchSummary", {
                paid: batch.summary.paid,
                failed: batch.summary.failed,
                pending: batch.summary.pending,
              })}{" "}
              · <span className="figure font-semibold">{formatINR(batch.summary.paidAmount)}</span>
            </p>
            <ul className="flex flex-col gap-1">
              {batch.items.map((item) => (
                <li key={item.transferId} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="min-w-32 font-semibold">{item.name}</span>
                  <span className="text-ink-2">
                    {t(`payouts.kind.${item.kind}`)} · {item.accountMasked}
                  </span>
                  <span className="figure">{formatINR(item.amount)}</span>
                  {item.status === "paid" ? (
                    <Badge tone="success">
                      <CircleCheck aria-hidden="true" className="size-4" />
                      {t("payouts.status.paid")}
                    </Badge>
                  ) : (
                    <Badge tone="danger" title={item.detail}>
                      <CircleX aria-hidden="true" className="size-4" />
                      {t("payouts.status.failed")}: {t(`payouts.failure.${item.failure ?? "payment_failed"}`)}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </details>
  );
}
