"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Download, FileUp, HandCoins, PenLine } from "lucide-react";
import {
  importPaidCsvAction,
  payArrearsAction,
  savePaidRecordAction,
  type CsvFormState,
  type PaidFormState,
} from "@/server/actions/payroll";
import { buttonVariants, Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { SubmitButton } from "@/components/ui/submit-button";
import { PayEntryForm, type PayEntryWorker } from "@/components/admin/pay-entry-form";

/** Record what was actually paid: one worker by hand, or a whole sheet as CSV. */
export function PaidRecordTools({ month, workers }: { month: string; workers: PayEntryWorker[] }) {
  const t = useTranslations("admin.payrollPage.record");
  const router = useRouter();
  const [open, setOpen] = useState<"form" | "csv" | null>(null);
  const [formState, formAction] = useActionState<PaidFormState, FormData>(async (prev, formData) => {
    const result = await savePaidRecordAction(prev, formData);
    if (result.ok) {
      setOpen(null);
      router.refresh();
    }
    return result;
  }, {});
  const [csvState, csvAction] = useActionState<CsvFormState, FormData>(importPaidCsvAction, {});

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={() => setOpen("form")}>
        <PenLine aria-hidden="true" className="size-4" />
        {t("manual")}
      </Button>
      <Button variant="secondary" onClick={() => setOpen("csv")}>
        <FileUp aria-hidden="true" className="size-4" />
        {t("upload")}
      </Button>
      <a href="/api/payroll/template" download className={buttonVariants({ variant: "ghost" })}>
        <Download aria-hidden="true" className="size-4" />
        {t("template")}
      </a>

      <Sheet open={open === "form"} onClose={() => setOpen(null)} title={t("manualTitle")}>
        <p className="text-ink-2">{t("manualHint")}</p>
        <PayEntryForm month={month} workers={workers} action={formAction} />
        {formState.error && (
          <p role="alert" className="text-sm font-semibold text-danger">
            {t(`errors.${formState.error}`)}
          </p>
        )}
      </Sheet>

      <Sheet open={open === "csv"} onClose={() => setOpen(null)} title={t("uploadTitle")}>
        <p className="text-ink-2">{t("uploadHint")}</p>
        <form action={csvAction} className="flex flex-col gap-3">
          <Label htmlFor="paid-csv">{t("file")}</Label>
          <input
            id="paid-csv"
            name="file"
            type="file"
            accept=".csv,text/csv"
            required
            className="min-h-12 rounded-2xl border border-line bg-surface p-2"
          />
          <div aria-live="polite" className="text-sm">
            {csvState.error && <p className="font-semibold text-danger">{t(`errors.${csvState.error}`)}</p>}
            {csvState.result && (
              <>
                <p className="font-semibold text-success">{t("imported", { count: csvState.result.saved })}</p>
                {csvState.result.errors.map((e) => (
                  <p key={e.row} className="text-danger">
                    {t("rowError", { row: e.row, reason: t(`errors.${e.reason}`) })}
                  </p>
                ))}
              </>
            )}
          </div>
          <SubmitButton size="lg">{t("import")}</SubmitButton>
        </form>
      </Sheet>
    </div>
  );
}

/** "Pay the gap": records an arrears payment of the outstanding amount, which clears it for the worker. */
export function PayGapButton({ workerId, month, amount }: { workerId: string; month: string; amount: string }) {
  const t = useTranslations("admin.payrollPage.arrears");
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  function pay() {
    setError(false);
    startTransition(async () => {
      const result = await payArrearsAction({ workerId, month });
      if (result.ok) {
        setConfirming(false);
        router.refresh();
      } else setError(true);
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setConfirming(true)}>
        <HandCoins aria-hidden="true" className="size-4" />
        {t("button", { amount })}
      </Button>
      <Sheet open={confirming} onClose={() => setConfirming(false)} title={t("title", { amount })}>
        <p className="text-ink-2">{t("hint")}</p>
        {error && (
          <p role="alert" className="text-sm font-semibold text-danger">
            {t("error")}
          </p>
        )}
        <Button size="lg" onClick={pay} disabled={pending} aria-busy={pending || undefined}>
          <HandCoins aria-hidden="true" className="size-5" />
          {t("confirm", { amount })}
        </Button>
      </Sheet>
    </>
  );
}
