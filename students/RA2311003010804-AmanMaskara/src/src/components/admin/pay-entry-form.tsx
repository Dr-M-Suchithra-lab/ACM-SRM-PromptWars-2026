"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { minutesAtStop, paidAmounts, sliderStops, stopFor, type PayslipFigures } from "@/core/pay-entry";
import { formatDuration, formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

/** What FairShift calculated for one worker this month: the starting point of the form. */
export interface PayEntryWorker extends PayslipFigures {
  id: string;
  label: string;
}

type Preset = "full" | "no_overtime" | "custom";
const PRESETS: Preset[] = ["full", "no_overtime", "custom"];
const HOUR_KINDS = ["regular", "overtime"] as const;
type HourKind = (typeof HOUR_KINDS)[number];
const AMOUNT_FIELDS = [
  { key: "gross", name: "grossPaid" },
  { key: "deductions", name: "deductions" },
  { key: "net", name: "netPaid" },
] as const;
type Amounts = Record<(typeof AMOUNT_FIELDS)[number]["key"], string>;

const toRupees = (paise: number) => (paise / 100).toFixed(2);
const recorded = (w: PayEntryWorker, kind: HourKind) => (kind === "regular" ? w.regularMinutes : w.overtimeMinutes);

/**
 * Manual entry built around what FairShift already knows: the worker's recorded time and rates.
 * The admin says how much of that time was paid (a preset or two sliders) and the amounts follow;
 * "Change amounts" allows typing the exact figures from the pay sheet. Time is kept in exact
 * minutes throughout, so "Paid in full" always matches FairPay Sentinel's check.
 */
export function PayEntryForm({
  month,
  workers,
  initialWorkerId,
  action,
}: {
  month: string;
  workers: PayEntryWorker[];
  initialWorkerId?: string;
  action: (formData: FormData) => void;
}) {
  const t = useTranslations("admin.payrollPage.record");
  const [workerId, setWorkerId] = useState(initialWorkerId ?? workers[0]?.id ?? "");
  const [preset, setPreset] = useState<Preset>("full");
  const [paidMinutes, setPaidMinutes] = useState<Record<HourKind, number> | null>(null);
  const [override, setOverride] = useState<Amounts | null>(null);
  const worker = workers.find((w) => w.id === workerId) ?? workers[0];
  if (!worker) return null;

  const all = { regular: worker.regularMinutes, overtime: worker.overtimeMinutes };
  const minutes = preset === "full" ? all : preset === "no_overtime" ? { ...all, overtime: 0 } : (paidMinutes ?? all);

  function reset(next: Preset) {
    setPreset(next);
    setPaidMinutes(null);
    setOverride(null);
  }

  const computed = paidAmounts(worker, { regularMinutes: minutes.regular, overtimeMinutes: minutes.overtime });
  const amounts: Amounts = override ?? {
    gross: toRupees(computed.gross),
    deductions: toRupees(computed.deductions),
    net: toRupees(computed.net),
  };
  const due = worker.gross - worker.deductions;
  const shortBy = due - Math.round(Number(amounts.net) * 100);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="month" value={month} />
      {/* Exact hours (minutes ÷ 60), never rounded: the pay check compares them minute for minute. */}
      <input type="hidden" name="paidRegularHours" value={minutes.regular / 60} />
      <input type="hidden" name="paidOvertimeHours" value={minutes.overtime / 60} />
      <div>
        <Label htmlFor="paid-worker">{t("worker")}</Label>
        <select
          id="paid-worker"
          name="workerId"
          value={worker.id}
          onChange={(e) => {
            setWorkerId(e.target.value);
            reset("full");
          }}
          className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-surface px-3"
        >
          {workers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.label}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-sm text-ink-2">
          {t("calculated", {
            hours: formatDuration(all.regular),
            overtime: formatDuration(all.overtime),
            amount: formatINR(due),
          })}
        </p>
      </div>

      <fieldset>
        <legend className="mb-2 font-bold">{t("howPaid")}</legend>
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((p) => {
            const disabled = p === "no_overtime" && all.overtime === 0;
            return (
              <label
                key={p}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border px-2 text-center text-sm font-bold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary",
                  preset === p
                    ? "border-primary bg-primary-soft text-primary-strong"
                    : "border-line bg-surface text-ink-2",
                  disabled && "cursor-not-allowed opacity-50",
                )}
              >
                <input
                  type="radio"
                  name="preset"
                  value={p}
                  checked={preset === p}
                  disabled={disabled}
                  onChange={() => reset(p)}
                  className="sr-only"
                />
                {t(`presets.${p}`)}
              </label>
            );
          })}
        </div>
      </fieldset>

      {preset === "custom" && (
        <div className="flex flex-col gap-3 rounded-2xl bg-surface-2/70 p-3">
          {HOUR_KINDS.map((kind) => {
            const total = recorded(worker, kind);
            return (
              <div key={kind}>
                <Label htmlFor={`paid-${kind}`} className="flex justify-between gap-2">
                  <span>{t(`${kind}Hours`)}</span>
                  <span className="figure">
                    {t("hoursOf", { paid: formatDuration(minutes[kind]), total: formatDuration(total) })}
                  </span>
                </Label>
                <input
                  id={`paid-${kind}`}
                  type="range"
                  min={0}
                  max={sliderStops(total)}
                  step={1}
                  value={stopFor(minutes[kind], total)}
                  aria-valuetext={formatDuration(minutes[kind])}
                  disabled={total === 0}
                  onChange={(e) => {
                    setOverride(null);
                    setPaidMinutes({ ...minutes, [kind]: minutesAtStop(Number(e.target.value), total) });
                  }}
                  className="mt-2 w-full accent-primary"
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-2xl border border-line p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-bold">{t("amounts")}</p>
          <Button size="sm" variant="ghost" onClick={() => setOverride(override ? null : amounts)}>
            {override ? t("useCalculated") : t("changeAmounts")}
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {AMOUNT_FIELDS.map(({ key, name }) => (
            <div key={key}>
              <Label htmlFor={`amount-${key}`} className="text-sm">
                {t(name)}
              </Label>
              <Input
                id={`amount-${key}`}
                name={name}
                inputMode="decimal"
                required
                readOnly={!override}
                value={amounts[key]}
                onChange={(e) => override && setOverride({ ...override, [key]: e.target.value.replace(/[^\d.]/g, "") })}
                className={cn("figure mt-1", !override && "bg-surface-2/60")}
              />
            </div>
          ))}
        </div>
        <p aria-live="polite" className={cn("text-sm font-semibold", shortBy > 100 ? "text-danger" : "text-success")}>
          {shortBy > 100 ? t("lessThanDue", { amount: formatINR(shortBy) }) : t("matchesDue")}
        </p>
      </div>
      <SubmitButton size="lg">{t("save")}</SubmitButton>
    </form>
  );
}
