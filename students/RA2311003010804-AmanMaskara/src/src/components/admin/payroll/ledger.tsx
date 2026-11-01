"use client";

import { useActionState, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  CircleAlert,
  CircleCheck,
  Clock,
  Download,
  ExternalLink,
  FileClock,
  FileUp,
  HandCoins,
  Landmark,
  PenLine,
  Send,
} from "lucide-react";
import type { LedgerRow } from "@/server/services/payroll-ledger";
import {
  importPaidCsvAction,
  payArrearsAction,
  savePaidRecordAction,
  type CsvFormState,
  type PaidFormState,
} from "@/server/actions/payroll";
import { startCheckoutAction } from "@/server/actions/payouts";
import { formatDuration, formatINR, formatRupees, formatWhen } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { SubmitButton } from "@/components/ui/submit-button";
import { PayEntryForm } from "@/components/admin/pay-entry-form";
import { AccountForm } from "@/components/admin/payroll/account-form";

type Provider = "cashfree" | "simulated" | null;
type Open =
  | { kind: "record"; workerId?: string }
  | { kind: "csv" }
  | { kind: "bank"; workerId: string }
  | { kind: "gap"; row: LedgerRow }
  | { kind: "checkout" }
  | null;

/** Owed money, a bank account the worker hasn't objected to (confirmed, or 48 hours passed), not already in a checkout. */
const canSelect = (r: LedgerRow) => Boolean(r.due && r.account?.usable && r.status !== "waiting");

/**
 * The month's payroll as one list: what each worker earned and was paid, FairPay Sentinel's
 * check, and their bank account. Tick the workers who are owed money to pay them together in one
 * checkout; record pay, upload a sheet or add bank details from the toolbar or the row itself.
 */
export function PayrollLedger({ month, provider, rows }: { month: string; provider: Provider; rows: LedgerRow[] }) {
  const t = useTranslations("admin.payrollPage");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState<Open>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectable = provider ? rows.filter(canSelect) : [];
  const chosen = selectable.filter((r) => selected.has(r.workerId));
  const chosenTotal = chosen.reduce((sum, r) => sum + r.due!.amount, 0);
  const allChosen = selectable.length > 0 && chosen.length === selectable.length;
  const totals = rows.reduce((acc, r) => ({ net: acc.net + r.net, paid: acc.paid + (r.paid ?? 0) }), {
    net: 0,
    paid: 0,
  });

  const close = () => setOpen(null);
  const refreshAndClose = () => {
    setOpen(null);
    router.refresh();
  };

  function toggle(workerId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(workerId)) next.delete(workerId);
      else next.add(workerId);
      return next;
    });
  }

  function checkout() {
    setError(null);
    startTransition(async () => {
      const result = await startCheckoutAction({ month, workerIds: chosen.map((r) => r.workerId) });
      if (result.ok) {
        // Off to the checkout (Cashfree's page, or the simulated one); it brings the employer back.
        window.location.assign(result.url);
        return;
      }
      setError(result.error);
      router.refresh();
    });
  }

  const select = (r: LedgerRow) =>
    canSelect(r) && provider ? (
      <input
        type="checkbox"
        className="size-5 shrink-0 accent-[var(--primary)]"
        checked={selected.has(r.workerId)}
        onChange={() => toggle(r.workerId)}
        aria-label={t("ledger.select", { name: r.name, amount: formatINR(r.due!.amount) })}
      />
    ) : (
      <span aria-hidden="true" className="inline-block size-5" />
    );

  const status = (r: LedgerRow) => (
    <StatusCell
      row={r}
      onRecord={() => setOpen({ kind: "record", workerId: r.workerId })}
      onGap={() => setOpen({ kind: "gap", row: r })}
    />
  );

  const bank = (r: LedgerRow) =>
    r.account ? (
      <span className="flex flex-col items-start">
        <button
          type="button"
          onClick={() => setOpen({ kind: "bank", workerId: r.workerId })}
          className="figure min-h-10 rounded-xl px-1 text-left text-sm text-ink-2 underline-offset-2 hover:text-ink hover:underline"
          aria-label={t("ledger.editBank", { name: r.name })}
        >
          {r.account.masked}
        </button>
        {r.account.status === "pending_worker" && (
          <span className="px-1 text-xs font-semibold text-warning-ink">
            {r.account.usable
              ? t("payouts.account.waitingOver")
              : t("payouts.account.waiting", { when: formatWhen(r.account.usableFrom!, locale) })}
          </span>
        )}
        {r.account.status === "disputed" && (
          <span className="px-1 text-xs font-semibold text-danger">{t("payouts.account.disputed")}</span>
        )}
      </span>
    ) : (
      <Button size="sm" variant="secondary" onClick={() => setOpen({ kind: "bank", workerId: r.workerId })}>
        {t("payouts.addAccount")}
      </Button>
    );

  const worked = (r: LedgerRow) =>
    t("ledger.worked", { days: r.daysWorked, time: formatDuration(r.regularMinutes) }) +
    (r.overtimeMinutes ? ` · ${t("ledger.overtime", { time: formatDuration(r.overtimeMinutes) })}` : "");

  return (
    <section aria-labelledby="ledger-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="ledger-title" className="font-display text-xl font-extrabold">
          {t("ledger.title")}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setOpen({ kind: "record" })}>
            <PenLine aria-hidden="true" className="size-4" />
            {t("record.manual")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen({ kind: "csv" })}>
            <FileUp aria-hidden="true" className="size-4" />
            {t("record.upload")}
          </Button>
          <a href="/api/payroll/template" download className={buttonVariants({ size: "sm", variant: "ghost" })}>
            <Download aria-hidden="true" className="size-4" />
            {t("record.template")}
          </a>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setOpen({ kind: "bank", workerId: rows[0]?.workerId ?? "" })}
          >
            <Landmark aria-hidden="true" className="size-4" />
            {t("payouts.account.edit")}
          </Button>
        </div>
      </div>

      {/* Phones: one card per worker. */}
      <ul className="flex flex-col gap-2 md:hidden">
        {rows.map((r) => (
          <li key={r.workerId}>
            <Card className={cn("flex gap-3 p-3", selected.has(r.workerId) && "border-primary bg-primary-soft/40")}>
              <div className="pt-1">{select(r)}</div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold">{r.name}</p>
                    <p className="text-xs text-ink-2">
                      #{r.code} · {worked(r)}
                    </p>
                  </div>
                  <p className="figure text-right font-semibold">
                    {formatINR(r.net)}
                    <span className="eyebrow block">{t("ledger.due")}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">{status(r)}</div>
                <div className="flex items-center gap-2 text-sm text-ink-2">
                  <Landmark aria-hidden="true" className="size-4" />
                  {bank(r)}
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      {/* Laptops: one table. */}
      <Card className="hidden overflow-x-auto p-0 md:block" tabIndex={0} role="region" aria-label={t("ledger.title")}>
        <table className="w-full min-w-[920px] text-left">
          <caption className="sr-only">{t("ledger.title")}</caption>
          <thead className="border-b border-line text-xs tracking-wide text-ink-2 uppercase">
            <tr>
              <th scope="col" className="w-10 px-3 py-3">
                {provider && selectable.length > 0 && (
                  <input
                    type="checkbox"
                    className="size-5 accent-[var(--primary)]"
                    checked={allChosen}
                    onChange={() => setSelected(allChosen ? new Set() : new Set(selectable.map((r) => r.workerId)))}
                    aria-label={t("ledger.selectAll")}
                  />
                )}
              </th>
              <th scope="col" className="px-3 py-3 font-bold">
                {t("worker")}
              </th>
              <th scope="col" className="px-3 py-3 font-bold">
                {t("ledger.workedColumn")}
              </th>
              <th scope="col" className="px-3 py-3 text-right font-bold">
                {t("ledger.due")}
              </th>
              <th scope="col" className="px-3 py-3 text-right font-bold">
                {t("paid")}
              </th>
              <th scope="col" className="px-3 py-3 font-bold">
                {t("checkColumn")}
              </th>
              <th scope="col" className="px-3 py-3 font-bold">
                {t("ledger.bank")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.workerId}
                className={cn(
                  "border-t border-line transition-colors hover:bg-surface-2/50",
                  selected.has(r.workerId) && "bg-primary-soft/40",
                )}
              >
                <td className="px-3 py-2.5">{select(r)}</td>
                <th scope="row" className="px-3 py-2.5 font-semibold">
                  {r.name}
                  <span className="block text-sm font-normal text-ink-2">
                    #{r.code} · {t(`basis.${r.basis}`)}
                  </span>
                </th>
                <td className="px-3 py-2.5 text-sm text-ink-2">{worked(r)}</td>
                <td className="figure px-3 py-2.5 text-right font-bold whitespace-nowrap">{formatINR(r.net)}</td>
                <td className="figure px-3 py-2.5 text-right whitespace-nowrap">
                  {r.paid === null ? "—" : formatINR(r.paid)}
                </td>
                <td className="px-3 py-2.5">
                  <span className="flex flex-wrap items-center gap-2">{status(r)}</span>
                </td>
                <td className="px-3 py-2.5">{bank(r)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="figure border-t-2 border-ink/60 bg-surface-2/50 font-bold">
            <tr>
              <td />
              <th scope="row" className="px-3 py-3">
                {t("total")}
              </th>
              <td />
              <td className="px-3 py-3 text-right whitespace-nowrap">{formatINR(totals.net)}</td>
              <td className="px-3 py-3 text-right whitespace-nowrap">{formatINR(totals.paid)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </Card>

      {/* Pay bar: stays in view while scrolling the list. */}
      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-3xl border border-line bg-surface/95 p-3 shadow-lg backdrop-blur">
        {provider ? (
          <>
            <Badge tone="info" className="hidden sm:inline-flex">
              <Landmark aria-hidden="true" className="size-4" />
              {t(`payouts.mode.${provider}`)}
            </Badge>
            <p aria-live="polite" className="min-w-0 flex-1 text-sm font-semibold">
              {chosen.length
                ? t("ledger.selected", { count: chosen.length, amount: formatINR(chosenTotal) })
                : t("ledger.idle")}
            </p>
            {chosen.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                {t("payouts.clear")}
              </Button>
            )}
            <Button onClick={() => setOpen({ kind: "checkout" })} disabled={chosen.length === 0}>
              <Send aria-hidden="true" className="size-4" />
              {t("ledger.pay")}
            </Button>
          </>
        ) : (
          <p className="text-sm font-semibold">{t("payouts.mode.off")}</p>
        )}
        {error && !open && (
          <p role="alert" className="w-full text-sm font-semibold text-danger">
            {t(`payouts.errors.${error}`)}
          </p>
        )}
      </div>

      <Sheet
        open={open?.kind === "checkout"}
        onClose={close}
        title={t("payouts.confirmTitle", { amount: formatINR(chosenTotal) })}
      >
        <p className="text-ink-2">
          {t("payouts.confirmHint", { count: chosen.length, amount: formatINR(chosenTotal) })}
        </p>
        <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line">
          {chosen.map((r) => (
            <li key={r.workerId} className="flex items-center justify-between gap-3 px-3 py-2">
              <span>
                <span className="font-bold">{r.name}</span>{" "}
                <span className="text-sm text-ink-2">
                  {t(`payouts.kind.${r.due!.kind}`)} · {r.account?.masked}
                </span>
              </span>
              <span className="figure font-semibold">{formatINR(r.due!.amount)}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm font-semibold text-warning-ink">{t("payouts.sandboxNote")}</p>
        {error && (
          <p role="alert" className="text-sm font-semibold text-danger">
            {t(`payouts.errors.${error}`)}
          </p>
        )}
        <Button size="lg" onClick={checkout} disabled={pending || chosen.length === 0} aria-busy={pending || undefined}>
          <ExternalLink aria-hidden="true" className="size-5" />
          {t("payouts.send", { amount: formatINR(chosenTotal) })}
        </Button>
      </Sheet>

      <Sheet open={open?.kind === "record"} onClose={close} title={t("record.manualTitle")}>
        {open?.kind === "record" && (
          <RecordPay month={month} rows={rows} initialWorkerId={open.workerId} onSaved={refreshAndClose} />
        )}
      </Sheet>

      <Sheet open={open?.kind === "csv"} onClose={close} title={t("record.uploadTitle")}>
        <CsvUpload onDone={() => router.refresh()} />
      </Sheet>

      <Sheet open={open?.kind === "bank"} onClose={close} title={t("payouts.account.title")}>
        {open?.kind === "bank" && (
          <AccountForm
            key={open.workerId}
            workerId={open.workerId}
            workers={rows.map((r) => ({ workerId: r.workerId, name: r.name, code: r.code, account: r.account }))}
            onPick={(workerId) => setOpen({ kind: "bank", workerId })}
            onSaved={refreshAndClose}
          />
        )}
      </Sheet>

      <Sheet
        open={open?.kind === "gap"}
        onClose={close}
        title={open?.kind === "gap" ? t("arrears.title", { amount: formatRupees(open.row.outstanding) }) : ""}
      >
        {open?.kind === "gap" && <MarkGapPaid row={open.row} month={month} onDone={refreshAndClose} />}
      </Sheet>
    </section>
  );
}

/** The FairPay check for one worker, with the one thing to do next right beside it. */
function StatusCell({ row, onRecord, onGap }: { row: LedgerRow; onRecord: () => void; onGap: () => void }) {
  const t = useTranslations("admin.payrollPage");
  const badge = (tone: "neutral" | "success" | "danger" | "warning", icon: ReactNode, text: string) => (
    <Badge tone={tone}>
      {icon}
      {text}
    </Badge>
  );
  switch (row.status) {
    case "waiting":
      return badge("warning", <Clock aria-hidden="true" className="size-4" />, t("payouts.status.pending"));
    case "not_entered":
      return (
        <>
          {badge("neutral", <FileClock aria-hidden="true" className="size-4" />, t("check.noRecord"))}
          <Button size="sm" variant="ghost" onClick={onRecord} aria-label={t("ledger.recordFor", { name: row.name })}>
            <PenLine aria-hidden="true" className="size-4" />
            {t("ledger.record")}
          </Button>
        </>
      );
    case "shortfall":
      return (
        <>
          {badge(
            "danger",
            <CircleAlert aria-hidden="true" className="size-4" />,
            t("check.shortfall", { amount: formatRupees(row.outstanding) }),
          )}
          <Button size="sm" variant="ghost" onClick={onGap} aria-label={t("ledger.markPaidFor", { name: row.name })}>
            <HandCoins aria-hidden="true" className="size-4" />
            {t("arrears.button")}
          </Button>
        </>
      );
    case "gap_paid":
      return badge(
        "success",
        <CircleCheck aria-hidden="true" className="size-4" />,
        t("check.gapPaid", { amount: formatRupees(row.arrearsPaid) }),
      );
    default:
      return badge("success", <CircleCheck aria-hidden="true" className="size-4" />, t("check.matches"));
  }
}

function RecordPay({
  month,
  rows,
  initialWorkerId,
  onSaved,
}: {
  month: string;
  rows: LedgerRow[];
  initialWorkerId?: string;
  onSaved: () => void;
}) {
  const t = useTranslations("admin.payrollPage.record");
  const [state, action] = useActionState<PaidFormState, FormData>(async (prev, formData) => {
    const result = await savePaidRecordAction(prev, formData);
    if (result.ok) onSaved();
    return result;
  }, {});
  return (
    <>
      <p className="text-ink-2">{t("manualHint")}</p>
      <PayEntryForm
        month={month}
        initialWorkerId={initialWorkerId}
        workers={rows.map((r) => ({
          id: r.workerId,
          label: `${r.name} (#${r.code})`,
          regularMinutes: r.regularMinutes,
          overtimeMinutes: r.overtimeMinutes,
          rates: r.rates,
          gross: r.gross,
          deductions: r.deductions,
        }))}
        action={action}
      />
      {state.error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {t(`errors.${state.error}`)}
        </p>
      )}
    </>
  );
}

function CsvUpload({ onDone }: { onDone: () => void }) {
  const t = useTranslations("admin.payrollPage.record");
  const [state, action] = useActionState<CsvFormState, FormData>(async (prev, formData) => {
    const result = await importPaidCsvAction(prev, formData);
    if (result.result) onDone();
    return result;
  }, {});
  return (
    <>
      <p className="text-ink-2">{t("uploadHint")}</p>
      <form action={action} className="flex flex-col gap-3">
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
          {state.error && <p className="font-semibold text-danger">{t(`errors.${state.error}`)}</p>}
          {state.result && (
            <>
              <p className="font-semibold text-success">{t("imported", { count: state.result.saved })}</p>
              {state.result.errors.map((e) => (
                <p key={e.row} className="text-danger">
                  {t("rowError", { row: e.row, reason: t(`errors.${e.reason}`) })}
                </p>
              ))}
            </>
          )}
        </div>
        <SubmitButton size="lg">{t("import")}</SubmitButton>
      </form>
    </>
  );
}

/** "Paid outside FairShift": records an arrears payment of exactly the open gap, which clears it. */
function MarkGapPaid({ row, month, onDone }: { row: LedgerRow; month: string; onDone: () => void }) {
  const t = useTranslations("admin.payrollPage.arrears");
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const amount = formatRupees(row.outstanding);

  function record() {
    setError(false);
    startTransition(async () => {
      const result = await payArrearsAction({ workerId: row.workerId, month });
      if (result.ok) onDone();
      else setError(true);
    });
  }

  return (
    <>
      <p className="text-ink-2">{t("hint")}</p>
      {error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {t("error")}
        </p>
      )}
      <Button size="lg" onClick={record} disabled={pending} aria-busy={pending || undefined}>
        <HandCoins aria-hidden="true" className="size-5" />
        {t("confirm", { amount })}
      </Button>
    </>
  );
}
