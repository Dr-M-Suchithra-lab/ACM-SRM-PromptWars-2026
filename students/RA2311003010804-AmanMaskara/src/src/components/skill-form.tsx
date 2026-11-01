"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { addSkillAction, adminAddSkillAction, type SkillFormState } from "@/server/actions/skills";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { SubmitButton } from "@/components/ui/submit-button";

/** Today in IST as YYYY-MM-DD: the latest completion date allowed. */
function todayIST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

/**
 * "Add skill": a worker's own entry (pending until the employer verifies it), or, when
 * `workers` is given, an admin's entry for one of them (verified on entry).
 */
export function AddSkill({ workers }: { workers?: { id: string; label: string }[] }) {
  const t = useTranslations("skills.add");
  const router = useRouter();
  const admin = Boolean(workers);
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<SkillFormState, FormData>(async (prev, formData) => {
    const result = await (admin ? adminAddSkillAction : addSkillAction)(prev, formData);
    if (result.ok) {
      setOpen(false);
      router.refresh();
    }
    return result;
  }, {});

  return (
    <>
      <Button
        variant={admin ? "secondary" : "primary"}
        size={admin ? "md" : "lg"}
        onClick={() => setOpen(true)}
        className={admin ? undefined : "w-full"}
      >
        <Plus aria-hidden="true" className="size-5" />
        {admin ? t("adminButton") : t("button")}
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={admin ? t("adminTitle") : t("title")}>
        <p className="text-ink-2">{admin ? t("adminHint") : t("hint")}</p>
        <form action={action} className="flex flex-col gap-3">
          {workers && (
            <div>
              <Label htmlFor="skill-worker">{t("worker")}</Label>
              <select
                id="skill-worker"
                name="workerId"
                required
                className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-surface px-3"
              >
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <Label htmlFor="skill-title">{t("name")}</Label>
            <Input
              id="skill-title"
              name="title"
              required
              minLength={2}
              maxLength={80}
              placeholder={t("namePlaceholder")}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="skill-issuer">{t("issuer")}</Label>
            <Input
              id="skill-issuer"
              name="issuer"
              required
              minLength={2}
              maxLength={80}
              placeholder={t("issuerPlaceholder")}
              className="mt-1"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="skill-date">{t("date")}</Label>
              <Input id="skill-date" name="date" type="date" required max={todayIST()} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="skill-evidence">{t("evidence")}</Label>
              <Input
                id="skill-evidence"
                name="evidence"
                maxLength={120}
                placeholder={t("evidencePlaceholder")}
                className="mt-1"
              />
            </div>
          </div>
          <p aria-live="polite" className="text-sm font-semibold text-danger">
            {state.error ? t(`errors.${state.error}`) : null}
          </p>
          <SubmitButton size="lg">{t("save")}</SubmitButton>
        </form>
      </Sheet>
    </>
  );
}
