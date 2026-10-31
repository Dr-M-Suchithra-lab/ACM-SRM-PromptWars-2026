"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

/** What FairShift calculated for one worker this month: the starting point of the form. */
export interface PayEntryWorker {
  id: string;
  label: string;
  regularMinutes: number;
  overtimeMinutes: number;
  /** Paise per hour */
  rates: { regular: number; overtime: number };
  /** Paise, from the payslip */
  gross: number;
  deductions: number;
}

type Preset = "full" | "no_overtime" | "custom";
const PRESETS: Preset[] = ["full", "no_overtime", "custom"];
const HOUR_KINDS = ["regular", "overtime"] as const;
const AMOUNT_FIELDS = [
  { key: "gross", name: "grossPaid" },
  { key: "deductions", name: "deductions" },
  { key: "net", name: "netPaid" },
] as const;
type Amounts = Record<(typeof AMOUNT_FIELDS)[number]["key"], string>;

const paiseFor = (hours: number, ratePerHour: number) => Math.round(hours * ratePerHour);
const toRupees = (paise: number) => (paise / 100).toFixed(2);
/** Hours rounded to a quarter, the sliders' step. */
const quarterHours = (minutes: number) => Math.round(minutes / 15) / 4;

/**
 * Manual entry built around what FairShift already knows: the worker's recorded hours and
 * rates. The admin says how many of those hours were paid (a preset or two sliders) and the
 * amounts follow; "Change amounts" allows typing the exact figures from the pay sheet.
 */
export function PayEntryForm({
  month,
  workers,
  action,
}: {
  month: string;
  workers: PayEntryWorker[];
  action: (formData: FormData) => void;
}) {
  const t = useTranslations("admin.payrollPage.record");
  const [workerId, setWorkerId] = useState(workers[0]?.id ?? "");
  const [preset, setPreset] = useState<Preset>("full");
  const [paidHours, setPaidHours] = useState<{ regular: number; overtime: number } | null>(null);
  const [override, setOverride] = useState<Amounts | null>(null);
  const worker = workers.find((w) => w.id === workerId) ?? workers[0];
  if (!worker) return null;

  const full = { regular: quarterHours(worker.regularMinutes), overtime: quarterHours(worker.overtimeMinutes) };
  const hours = preset === "full" ? full : preset === "no_overtime" ? { ...full, overtime: 0 } : (paidHours ?? full);

  function reset(next: Preset) {
    setPreset(next);
    setPaidHours(null);
    setOverride(null);
  }

  // Paid in full uses the payslip's own figures; anything else is hours × rate.
  const gross =
    preset === "full"
      ? worker.gross
      : paiseFor(hours.regular, worker.rates.regular) + paiseFor(hours.overtime, worker.rates.overtime);
  const deductions = Math.min(worker.deductions, gross);
  const amounts: Amounts = override ?? {
    gross: toRupees(gross),
    deductions: toRupees(deductions),
    net: toRupees(gross - deductions),
  };
  const due = worker.gross - worker.deductions;
  const shortBy = due - Math.round(Number(amounts.net) * 100);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="month" value={month} />
      <input type="hidden" name="paidRegularHours" value={hours.regular} />
      <input type="hidden" name="paidOvertimeHours" value={hours.overtime} />
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
          {t("calculated", { hours: full.regular, overtime: full.overtime, amount: formatINR(due) })}
        </p>
      </div>

      <fieldset>
        <legend className="mb-2 font-bold">{t("howPaid")}</legend>
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((p) => {
            const disabled = p === "no_overtime" && full.overtime === 0;
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
          {HOUR_KINDS.map((kind) => (
            <div key={kind}>
              <Label htmlFor={`paid-${kind}`} className="flex justify-between gap-2">
                <span>{t(`${kind}Hours`)}</span>
                <span className="figure">{t("hoursOf", { paid: hours[kind], total: full[kind] })}</span>
              </Label>
              <input
                id={`paid-${kind}`}
                type="range"
                min={0}
                max={full[kind]}
                step={0.25}
                value={hours[kind]}
                disabled={full[kind] === 0}
                onChange={(e) => {
                  setOverride(null);
                  setPaidHours({ ...hours, [kind]: Number(e.target.value) });
                }}
                className="mt-2 w-full accent-primary"
              />
            </div>
          ))}
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
