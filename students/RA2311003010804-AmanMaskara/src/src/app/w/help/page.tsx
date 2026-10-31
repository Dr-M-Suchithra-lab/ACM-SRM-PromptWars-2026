import { getTranslations } from "next-intl/server";
import { Phone, Siren } from "lucide-react";
import { requireRole } from "@/server/dal";
import { HELPLINES } from "@/config/helplines";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { SpeakButton } from "@/components/speak-button";
import { HelpAssistant } from "@/components/worker/help-assistant";

const GROUPS = ["emergency", "support", "rights"] as const;

export default async function HelpPage() {
  await requireRole("worker");
  const t = await getTranslations("help");
  const emergency = HELPLINES[0];

  return (
    <div className="flex flex-col gap-6 md:mx-auto md:w-full md:max-w-3xl">
      <PageHeader title={t("title")} action={<SpeakButton text={`${t("title")}. ${t("emergencyHint")}`} />}>
        {t("intro")}
      </PageHeader>

      {/* One tap, no typing: in danger nobody should have to read further than this. */}
      <a
        href={`tel:${emergency.dial}`}
        className="press flex items-center gap-4 rounded-card bg-danger p-5 text-white shadow-[var(--shadow-lift)]"
      >
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/20">
          <Siren aria-hidden="true" className="size-8" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-display block text-2xl leading-tight font-extrabold">
            {t("callEmergency", { number: emergency.number })}
          </span>
          <span className="block text-white/90">{t("emergencyHint")}</span>
        </span>
      </a>

      <HelpAssistant />

      {GROUPS.map((group) => (
        <section key={group} aria-labelledby={`lines-${group}`} className="flex flex-col gap-2.5">
          <h2 id={`lines-${group}`} className="font-display text-xl font-extrabold">
            {t(`groups.${group}`)}
          </h2>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {HELPLINES.filter((line) => line.kind === group).map((line) => (
              <li key={line.id}>
                <a href={`tel:${line.dial}`} className="tile flex min-h-16 items-center gap-3 p-3">
                  <span
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-xl",
                      group === "emergency" ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary-strong",
                    )}
                  >
                    <Phone aria-hidden="true" className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{t(`lines.${line.id}.name`)}</span>
                    <span className="block text-sm text-ink-2">
                      {t(`lines.${line.id}.what`)} · {line.allDay ? t("allDay") : t("officeHours")}
                    </span>
                  </span>
                  <span
                    className={cn(
                      buttonVariants({ variant: group === "emergency" ? "danger" : "secondary", size: "sm" }),
                      "figure pointer-events-none",
                    )}
                  >
                    {line.number}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-sm text-ink-2">{t("disclaimer")}</p>
    </div>
  );
}
