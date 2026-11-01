"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Delete, Loader2 } from "lucide-react";
import { loginAdmin, loginWorker, type LoginState } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Tab = "worker" | "admin";
type Field = "code" | "pin";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"] as const;
const MAX_LEN: Record<Field, number> = { code: 6, pin: 4 };

/** Tabs and every keypad press are local state: none of them touches browser history. */
export function LoginForms({ initialTab = "worker" }: { initialTab?: Tab }) {
  const t = useTranslations("login");
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <section className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label={t("loginButton")}
        className="grid grid-cols-2 gap-1 rounded-full border border-line bg-surface-2 p-1"
      >
        {(["worker", "admin"] as const).map((value) => (
          <Button
            key={value}
            role="tab"
            id={`tab-${value}`}
            aria-selected={tab === value}
            aria-controls={`panel-${value}`}
            variant={tab === value ? "primary" : "ghost"}
            className={tab === value ? "" : "text-ink-2 hover:bg-surface"}
            tabIndex={tab === value ? 0 : -1}
            onClick={() => setTab(value)}
          >
            {t(value === "worker" ? "workerTab" : "adminTab")}
          </Button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "worker" ? <WorkerForm /> : <AdminForm />}
      </div>
    </section>
  );
}

function ErrorMessage({ state }: { state: LoginState }) {
  const t = useTranslations("login");
  if (!state.error) return null;
  const key = state.error === "locked" ? "errorLocked" : state.error === "invalid" ? "errorInvalid" : "errorGeneral";
  return (
    <p role="alert" className="rounded-2xl bg-danger-soft p-3 font-semibold text-danger">
      {t(key)}
    </p>
  );
}

function WorkerForm() {
  const t = useTranslations("login");
  const [state, formAction, pending] = useActionState(loginWorker, {});
  const [values, setValues] = useState<Record<Field, string>>({ code: "", pin: "" });
  const [active, setActive] = useState<Field>("code");

  function press(key: (typeof KEYS)[number]) {
    navigator.vibrate?.(10);
    setValues((prev) => {
      const current = prev[active];
      if (key === "back") return { ...prev, [active]: current.slice(0, -1) };
      if (current.length >= MAX_LEN[active]) return prev;
      return { ...prev, [active]: current + key };
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <ErrorMessage state={state} />
      {(["code", "pin"] as const).map((field) => (
        <div key={field}>
          <Label htmlFor={`worker-${field}`}>{t(field === "code" ? "enterCode" : "enterPin")}</Label>
          <Input
            id={`worker-${field}`}
            name={field}
            type={field === "pin" ? "password" : "text"}
            inputMode="numeric"
            autoComplete={field === "pin" ? "current-password" : "username"}
            pattern={field === "pin" ? "\\d{4}" : "\\d{4,6}"}
            maxLength={MAX_LEN[field]}
            required
            value={values[field]}
            onFocus={() => setActive(field)}
            onChange={(e) => setValues((prev) => ({ ...prev, [field]: e.target.value.replace(/\D/g, "") }))}
            className={cn(
              "figure mt-1.5 min-h-14 text-center text-2xl tracking-[0.4em]",
              active === field && "border-primary ring-2 ring-primary/25",
            )}
          />
        </div>
      ))}

      <div role="group" className="grid grid-cols-3 gap-2" aria-label={t("keypad")}>
        {KEYS.map((key) =>
          key === "" ? (
            <span key="blank" aria-hidden="true" />
          ) : (
            <Button
              key={key}
              variant="ghost"
              size="lg"
              className="key figure min-h-16 rounded-2xl bg-surface-2 text-2xl hover:translate-y-0 hover:bg-primary-soft"
              aria-label={key === "back" ? t("deleteDigit") : key}
              onClick={() => press(key)}
            >
              {key === "back" ? <Delete aria-hidden="true" className="size-7" /> : key}
            </Button>
          ),
        )}
      </div>

      <Button type="submit" size="lg" disabled={pending} aria-busy={pending || undefined}>
        {pending ? <Loader2 aria-hidden="true" className="size-5 animate-spin" /> : null}
        {t("loginButton")}
      </Button>
    </form>
  );
}

function AdminForm() {
  const t = useTranslations("login");
  const [state, formAction, pending] = useActionState(loginAdmin, {});
  return (
    <form action={formAction} className="admin flex flex-col gap-4">
      <ErrorMessage state={state} />
      <div>
        <Label htmlFor="admin-email">{t("email")}</Label>
        <Input id="admin-email" name="email" type="email" autoComplete="username" required className="mt-1" />
      </div>
      <div>
        <Label htmlFor="admin-password">{t("password")}</Label>
        <Input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1"
        />
      </div>
      <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
        {pending ? <Loader2 aria-hidden="true" className="size-5 animate-spin" /> : null}
        {t("loginButton")}
      </Button>
    </form>
  );
}
