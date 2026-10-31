import { getTranslations } from "next-intl/server";
import { ShieldAlert, TimerOff } from "lucide-react";
import { PublicShell } from "@/components/public-shell";

/** Friendly page for a tampered, broken or expired share link — never a raw 404. */
export async function VerificationError({
  kind,
  reason,
}: {
  kind: "passport" | "certificate";
  reason: "expired" | "invalid";
}) {
  const t = await getTranslations("verify");
  const expired = reason === "expired";
  const Icon = expired ? TimerOff : ShieldAlert;
  return (
    <PublicShell>
      <section role="alert" className="card flex flex-col items-center gap-3 px-5 py-10 text-center">
        <span
          className={`flex size-16 items-center justify-center rounded-3xl ${expired ? "bg-warning-soft text-warning-ink" : "bg-danger-soft text-danger"}`}
        >
          <Icon aria-hidden="true" className="size-8" />
        </span>
        <h1 className="font-display text-2xl font-extrabold">{expired ? t(`${kind}Expired`) : t(`${kind}Invalid`)}</h1>
        <p className="text-ink-2">{expired ? t("expiredHint") : t("invalidHint")}</p>
      </section>
    </PublicShell>
  );
}
