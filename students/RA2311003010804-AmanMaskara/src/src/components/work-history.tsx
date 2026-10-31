import { useTranslations } from "next-intl";
import { BadgeCheck, Building2, PenLine } from "lucide-react";
import type { WorkHistoryEntry } from "@/core/work-history";
import { formatDay, formatDuration } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

/** Work history rows, each labelled by where it comes from: employer-verified check-ins or self-reported. */
export function WorkHistoryList({
  entries,
  showHours,
  locale,
}: {
  entries: WorkHistoryEntry[];
  showHours: boolean;
  locale: string;
}) {
  const t = useTranslations("passport");
  return (
    <ul className="flex flex-col gap-2.5">
      {entries.map((entry) => {
        const verified = entry.source === "verified_employer";
        return (
          <li key={`${entry.employer}-${entry.site}-${entry.from}`} className="card flex items-start gap-3 p-4">
            <span
              className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${verified ? "bg-success-soft text-success" : "bg-surface-2 text-ink-2"}`}
            >
              <Building2 aria-hidden="true" className="size-6" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="font-bold">
                {entry.role} · {entry.employer}
              </p>
              {entry.site && <p className="text-sm text-ink-2">{entry.site}</p>}
              <p className="figure text-sm text-ink-2">
                {t(`sector.${entry.sector}`)} · {formatDay(entry.from, locale)} – {formatDay(entry.to, locale)}
              </p>
              {verified && (
                <p className="figure text-sm font-semibold">
                  {t("days", { count: entry.days })}
                  {showHours && ` · ${formatDuration(entry.minutes)}`}
                </p>
              )}
              <Badge tone={verified ? "success" : "neutral"} className="mt-1 w-fit">
                {verified ? (
                  <BadgeCheck aria-hidden="true" className="size-4" />
                ) : (
                  <PenLine aria-hidden="true" className="size-4" />
                )}
                {t(verified ? "verifiedByEmployer" : "selfReported")}
              </Badge>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
