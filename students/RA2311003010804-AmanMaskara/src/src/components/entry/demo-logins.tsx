import { getTranslations } from "next-intl/server";
import { ArrowRight, HardHat, Hospital, LayoutDashboard, Stethoscope } from "lucide-react";
import { demoLogin } from "@/server/actions/auth";
import { isDemoMode } from "@/server/config";
import { cn } from "@/lib/utils";
import { SubmitButton } from "@/components/ui/submit-button";

const PERSONAS = [
  { persona: "ramesh", key: "demoRamesh", Icon: HardHat, tone: "bg-accent-soft text-warning-ink" },
  { persona: "sunita", key: "demoSunita", Icon: Hospital, tone: "bg-primary-soft text-primary-strong" },
  { persona: "priya", key: "demoPriya", Icon: LayoutDashboard, tone: "bg-info-soft text-[#2558b5]" },
  { persona: "arjun", key: "demoArjun", Icon: Stethoscope, tone: "bg-success-soft text-success" },
] as const;

/** One-tap demo logins (demo mode only): both sectors, worker and employer, in one tap each. */
export async function DemoLogins({ compact = false }: { compact?: boolean }) {
  if (!isDemoMode()) return null;
  const t = await getTranslations("login");
  return (
    <section aria-labelledby="demo-title" className="flex flex-col gap-3">
      <h2 id="demo-title" className="eyebrow flex items-center gap-2">
        <span className="live-dot" aria-hidden="true" />
        {t("demoTitle")}
      </h2>
      <ul className={cn("stagger grid gap-2.5", !compact && "sm:grid-cols-2")}>
        {PERSONAS.map(({ persona, key, Icon, tone }) => (
          <li key={persona}>
            <form action={demoLogin}>
              <input type="hidden" name="persona" value={persona} />
              <SubmitButton
                unstyled
                className="tile group flex min-h-16 w-full items-center gap-3 px-3 py-2.5 text-left font-bold"
              >
                <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", tone)}>
                  <Icon aria-hidden="true" className="size-6" />
                </span>
                <span className="flex-1 leading-tight">{t(key)}</span>
                <ArrowRight aria-hidden="true" className="nudge size-5 text-primary" />
              </SubmitButton>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
