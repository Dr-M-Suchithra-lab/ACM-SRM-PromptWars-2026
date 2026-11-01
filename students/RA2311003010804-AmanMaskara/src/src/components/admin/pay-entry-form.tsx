"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  aboveDue,
  belowRecorded,
  paidAmounts,
  presetAllowed,
  presetFor,
  sliderMinutes,
  stopIndex,
  type PayslipFigures,
  type Preset,
  type RecordedPay,
} from "@/core/pay-entry";
import { formatDuration, formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

/** What FairShift calculated for one worker this month, and what is already recorded as paid. */
export interface PayEntryWorker extends PayslipFigures {
  id: string;
  label: string;
  recorded: RecordedPay | null;
}

const PRESETS: Preset[] = ["full", "no_overtime", "custom"];
const HOUR_KINDS = ["regular", "overtime"] as const;
type HourKind = (typeof HOUR_KINDS)[number];
type Minutes = Record<HourKind, number>;
const AMOUNT_FIELDS = [
  { key: "gross", name: "grossPaid" },
  { key: "deductions", name: "deductions" },
  { key: "net", name: "netPaid" },
] as const;
type Amounts = Record<(typeof AMOUNT_FIELDS)[number]["key"], string>;

const toRupees = (paise: number) => (paise / 100).toFixed(2);
const toPaise = (rupees: string) => Math.round(Number(rupees) * 100);
const worked = (w: PayEntryWorker): Minutes => ({ regular: w.regularMinutes, overtime: w.overtimeMinutes });
const paidSoFar = (w: PayEntryWorker): Minutes => ({
  regular: w.recorded?.regularMinutes ?? 0,
  overtime: w.recorded?.overtimeMinutes ?? 0,
});

/** The form opens on what is already recorded: its preset, hours and exact amounts. */
function startFor(w: PayEntryWorker) {
  const recorded = w.recorded;
  return {
    preset: presetFor({ regularMinutes: w.regularMinutes, overtimeMinutes: w.overtimeMinutes }, recorded),
    paidMinutes: recorded ? paidSoFar(w) : null,
    override: recorded
      ? { gross: toRupees(recorded.gross), deductions: toRupees(recorded.deductions), net: toRupees(recorded.net) }
      : null,
  };
}

/**
 * Manual entry built around what FairShift already knows: the worker's recorded time and rates,
 * and what is already recorded as paid. The admin says how much of that time was paid in total
 * (a preset or two sliders) and the amounts follow; "Change amounts" allows typing the exact
 * figures from the pay sheet. Pay already recorded is the floor: the sliders start there and
 * can't go lower, and "Overtime not paid" is offered only while no overtime is paid. Time is kept
 * in exact minutes, so "Paid in full" always matches FairPay Sentinel's check.
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
  const first = workers.find((w) => w.id === initialWorkerId) ?? workers[0];
  const [workerId, setWorkerId] = useState(first?.id ?? "");
  const [preset, setPreset] = useState<Preset>(() => (first ? startFor(first).preset : "full"));
  const [paidMinutes, setPaidMinutes] = useState<Minutes | null>(() => (first ? startFor(first).paidMinutes : null));
  const [override, setOverride] = useState<Amounts | null>(() => (first ? startFor(first).override : null));
  const worker = workers.find((w) => w.id === workerId) ?? workers[0];
  if (!worker) return null;

  const all = worked(worker);
  const floor = paidSoFar(worker);
  const minutes: Minutes =
    preset === "full" ? all : preset === "no_overtime" ? { ...all, overtime: 0 } : (paidMinutes ?? all);

  function choose(next: Preset) {
    setPreset(next);
    setPaidMinutes(null);
    setOverride(null);
  }

  function pickWorker(id: string) {
    const next = workers.find((w) => w.id === id);
    if (!next) return;
    const start = startFor(next);
    setWorkerId(id);
    setPreset(start.preset);
    setPaidMinutes(start.paidMinutes);
    setOverride(start.override);
  }

  const computed = paidAmounts(worker, { regularMinutes: minutes.regular, overtimeMinutes: minutes.overtime });
  const amounts: Amounts = override ?? {
    gross: toRupees(computed.gross),
    deductions: toRupees(computed.deductions),
    net: toRupees(computed.net),
  };
  const due = worker.gross - worker.deductions;
  const shortBy = due - toPaise(amounts.net);
  const below = belowRecorded(
    {
      regularMinutes: minutes.regular,
      overtimeMinutes: minutes.overtime,
      gross: toPaise(amounts.gross),
      deductions: toPaise(amounts.deductions),
      net: toPaise(amounts.net),
    },
    worker.recorded,
  );

  const tooMuch = aboveDue(
    { regularMinutes: minutes.regular, overtimeMinutes: minutes.overtime, net: toPaise(amounts.net) },
    { regularMinutes: all.regular, overtimeMinutes: all.overtime, net: due },
  );

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
          onChange={(e) => pickWorker(e.target.value)}
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
        {worker.recorded && (
          <p className="mt-1.5 rounded-2xl bg-info-soft px-3 py-2 text-sm">
            {t("recordedNote", {
              hours: formatDuration(worker.recorded.regularMinutes),
              overtime: formatDuration(worker.recorded.overtimeMinutes),
              amount: formatINR(worker.recorded.net),
            })}
          </p>
        )}
      </div>

      <fieldset>
        <legend className="mb-2 font-bold">{t("howPaid")}</legend>
        {/* Three in a row when they fit; longer labels (Tamil, Telugu) wrap onto a second row. */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => {
            const disabled = !presetAllowed(
              p,
              { regularMinutes: all.regular, overtimeMinutes: all.overtime },
              worker.recorded,
            );
            return (
              <label
                key={p}
                className={cn(
                  "flex min-h-12 flex-1 basis-0 cursor-pointer items-center justify-center rounded-2xl border px-2 text-center text-sm font-bold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary",
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
                  onChange={() => choose(p)}
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
            const stops = sliderMinutes(all[kind], floor[kind]);
            return (
              <div key={kind}>
                <Label htmlFor={`paid-${kind}`} className="flex justify-between gap-2">
                  <span>{t(`${kind}Hours`)}</span>
                  <span className="figure">
                    {t("hoursOf", { paid: formatDuration(minutes[kind]), total: formatDuration(all[kind]) })}
                  </span>
                </Label>
                <input
                  id={`paid-${kind}`}
                  type="range"
                  min={0}
                  max={stops.length - 1}
                  step={1}
                  value={stopIndex(stops, minutes[kind])}
                  aria-valuetext={formatDuration(minutes[kind])}
                  disabled={stops.length < 2}
                  onChange={(e) => {
                    setOverride(null);
                    setPaidMinutes({ ...minutes, [kind]: stops[Number(e.target.value)] ?? stops[0] });
                  }}
                  className="mt-2 w-full accent-primary"
                />
                {floor[kind] > 0 && stops.length > 1 && (
                  <p className="mt-1 text-xs text-ink-2">
                    {t("fromRecorded", { time: formatDuration(Math.min(floor[kind], all[kind])) })}
                  </p>
                )}
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
        {below && (
          <p role="alert" className="text-sm font-semibold text-danger">
            {t("errors.below_recorded")}
          </p>
        )}
        {tooMuch && (
          <p role="alert" className="text-sm font-semibold text-danger">
            {t("errors.above_due")}
          </p>
        )}
      </div>
      <SubmitButton size="lg" disabled={below || tooMuch}>
        {t("save")}
      </SubmitButton>
    </form>
  );
}
