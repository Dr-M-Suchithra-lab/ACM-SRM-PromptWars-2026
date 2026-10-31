"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import { decideCertificateAction } from "@/server/actions/benefits";
import { decideSkillAction } from "@/server/actions/skills";
import { Button } from "@/components/ui/button";

/** Approve (signs the certificate) or reject a worker's work-certificate request. */
export function CertificateDecision({ id }: { id: string }) {
  const t = useTranslations("admin.peoplePage.certificates");
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function decide(approve: boolean) {
    setFailed(false);
    startTransition(async () => {
      const result = await decideCertificateAction({ id, approve });
      if (result.ok) router.refresh();
      else setFailed(true);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" onClick={() => decide(true)} disabled={pending}>
        <Check aria-hidden="true" className="size-4" />
        {t("approve")}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => decide(false)} disabled={pending}>
        <X aria-hidden="true" className="size-4" />
        {t("reject")}
      </Button>
      {failed && (
        <span role="alert" className="text-sm font-semibold text-danger">
          {t("error")}
        </span>
      )}
    </div>
  );
}

/** Verify (the skill then shows on the worker's passport) or reject a worker's pending skill. */
export function SkillDecision({ id }: { id: string }) {
  const t = useTranslations("admin.peoplePage.skills");
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function decide(verify: boolean) {
    setFailed(false);
    startTransition(async () => {
      const result = await decideSkillAction({ id, verify });
      if (result.ok) router.refresh();
      else setFailed(true);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" onClick={() => decide(true)} disabled={pending}>
        <Check aria-hidden="true" className="size-4" />
        {t("verify")}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => decide(false)} disabled={pending}>
        <X aria-hidden="true" className="size-4" />
        {t("reject")}
      </Button>
      {failed && (
        <span role="alert" className="text-sm font-semibold text-danger">
          {t("error")}
        </span>
      )}
    </div>
  );
}
