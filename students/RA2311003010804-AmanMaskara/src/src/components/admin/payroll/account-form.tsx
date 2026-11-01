"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { MaskedAccount } from "@/server/services/payouts";
import { savePayoutAccountAction, type AccountFormState } from "@/server/actions/payouts";
import { formatWhen } from "@/lib/format";
import { Input, Label } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

export interface AccountChoice {
  workerId: string;
  name: string;
  code: string;
  account: MaskedAccount | null;
}

/** Where a worker's share of a checkout is settled. Only the last four digits are ever shown back. */
export function AccountForm({
  workerId,
  workers,
  onPick,
  onSaved,
}: {
  workerId: string;
  workers: AccountChoice[];
  onPick: (workerId: string) => void;
  onSaved: () => void;
}) {
  const t = useTranslations("admin.payrollPage.payouts.account");
  const locale = useLocale();
  const current = workers.find((w) => w.workerId === workerId) ?? workers[0];
  const [state, action] = useActionState<AccountFormState, FormData>(async (prev, formData) => {
    const result = await savePayoutAccountAction(prev, formData);
    if (result.ok) onSaved();
    return result;
  }, {});
  if (!current) return null;

  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-ink-2">{t("hint")}</p>
      <div>
        <Label htmlFor="payout-worker">{t("worker")}</Label>
        <select
          id="payout-worker"
          name="workerId"
          value={current.workerId}
          onChange={(e) => onPick(e.target.value)}
          className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-surface px-3"
        >
          {workers.map((w) => (
            <option key={w.workerId} value={w.workerId}>
              {w.name} (#{w.code})
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-sm text-ink-2">
          {current.account ? t("current", { masked: current.account.masked, ifsc: current.account.ifsc }) : t("none")}
        </p>
        {current.account && current.account.history.length > 0 && (
          <details className="mt-1.5 text-sm">
            <summary className="min-h-8 cursor-pointer font-semibold">{t("history")}</summary>
            <ul className="mt-1 flex flex-col gap-0.5 text-ink-2">
              {current.account.history.slice(0, 6).map((e) => (
                <li key={`${e.at.toISOString()}-${e.action}`}>
                  {formatWhen(e.at, locale)} · {t(`events.${e.action}`)} · ••••{e.last4}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
      <p className="rounded-2xl bg-info-soft px-3 py-2 text-sm">{t("confirmNote", { name: current.name })}</p>
      <div>
        <Label htmlFor="payout-holder">{t("holder")}</Label>
        <Input
          id="payout-holder"
          name="holder"
          required
          maxLength={100}
          autoComplete="off"
          defaultValue={current.account?.holder ?? current.name}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="payout-account">{t("number")}</Label>
        <Input
          id="payout-account"
          name="account"
          required
          inputMode="numeric"
          pattern="[0-9 ]{9,22}"
          maxLength={22}
          autoComplete="off"
          className="figure mt-1"
        />
      </div>
      <div>
        <Label htmlFor="payout-ifsc">{t("ifsc")}</Label>
        <Input
          id="payout-ifsc"
          name="ifsc"
          required
          maxLength={11}
          autoComplete="off"
          autoCapitalize="characters"
          defaultValue={current.account?.ifsc ?? ""}
          className="figure mt-1 uppercase"
        />
      </div>
      {state.error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {t(`errors.${state.error}`)}
        </p>
      )}
      <SubmitButton size="lg">{t("save")}</SubmitButton>
    </form>
  );
}
