import { useTranslations } from "next-intl";
import { CircleCheck, CircleDot, Clock, Timer, XCircle } from "lucide-react";
import { ESCALATION_CHAINS } from "@/config/hazard-sla";
import { deadlineState, getHazardAge, isOpen } from "@/core/hazard-lifecycle";
import type { Hazard, HazardStatus, HazardTimelineEntry, Sector } from "@/core/types";
import { formatAge, formatWhen } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const STATUS = {
  received: { tone: "neutral", Icon: CircleDot },
  in_progress: { tone: "warning", Icon: Clock },
  fixed: { tone: "success", Icon: CircleCheck },
  dismissed: { tone: "neutral", Icon: XCircle },
} as const;

/** Status as icon + word (never colour alone). */
export function HazardStatusBadge({ status }: { status: HazardStatus }) {
  const t = useTranslations("report.status");
  const { tone, Icon } = STATUS[status];
  return (
    <Badge tone={tone}>
      <Icon aria-hidden="true" className="size-4" />
      {t(status)}
    </Badge>
  );
}

const AGE_TONE = { on_track: "neutral", due_soon: "warning", overdue: "danger" } as const;

/** "Open 3d 4h": amber near the deadline, red past it. Nothing for closed hazards. */
export function HazardAge({ hazard, now, className }: { hazard: Hazard; now: Date; className?: string }) {
  const t = useTranslations("report.age");
  if (!isOpen(hazard)) return null;
  const state = deadlineState(hazard, now);
  return (
    <Badge tone={AGE_TONE[state]} className={cn("figure", className)}>
      <Timer aria-hidden="true" className="size-4" />
      {t("open", { age: formatAge(getHazardAge(hazard, now)) })}
      {state !== "on_track" && <span className="sr-only">. {t(state)}</span>}
    </Badge>
  );
}

/** The hazard's history in the viewer's language. Escalations name the role they went to. */
export function HazardTimeline({
  timeline,
  sector,
  locale,
}: {
  timeline: HazardTimelineEntry[];
  sector: Sector;
  locale: string;
}) {
  const t = useTranslations("report");
  const chain = ESCALATION_CHAINS[sector];
  return (
    <ol className="relative flex flex-col gap-4 pl-7 before:absolute before:top-2 before:bottom-2 before:left-[9px] before:w-0.5 before:bg-line">
      {timeline.map((step, i) => (
        <li key={i} className="relative">
          <span
            aria-hidden="true"
            className={cn(
              "absolute top-1.5 -left-7 size-5 rounded-full border-4 border-surface ring-1 ring-line",
              step.status === "escalated"
                ? "bg-danger"
                : step.status === "fixed" || step.status === "confirmed"
                  ? "bg-success"
                  : "bg-primary",
            )}
          />
          <p className="font-bold">
            {step.status === "escalated" && step.level
              ? t("events.escalated", { role: t(`roles.${chain[Math.min(step.level, chain.length) - 1]}`) })
              : t(`events.${step.status}`)}
          </p>
          {step.note && step.status === "dismissed" && (
            <p className="text-ink-2">
              {t.has(`dismissReasons.${step.note}`) ? t(`dismissReasons.${step.note}`) : step.note}
            </p>
          )}
          {step.note && (step.status === "fixed" || step.status === "reopened") && (
            <p className="text-ink-2">{step.note === "not_fixed" ? t("events.notFixedNote") : step.note}</p>
          )}
          <p className="figure text-sm text-ink-2">{formatWhen(step.at, locale)}</p>
        </li>
      ))}
    </ol>
  );
}
