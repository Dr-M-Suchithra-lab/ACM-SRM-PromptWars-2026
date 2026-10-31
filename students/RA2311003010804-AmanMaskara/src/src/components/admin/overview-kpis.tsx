import { useTranslations } from "next-intl";
import { Activity, Clock, Smile, TriangleAlert } from "lucide-react";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

interface OverviewKpisProps {
  onSite: number;
  workerCount: number;
  overtimeMinutes: number;
  openHazards: number;
  escalatedHazards: number;
  moodAverage: number | null;
  responses: number;
  tired: number;
}

/** The overview's headline numbers: who is on site now (the hero), then one card per figure. */
export function OverviewKpis({
  onSite,
  workerCount,
  overtimeMinutes,
  openHazards,
  escalatedHazards,
  moodAverage,
  responses,
  tired,
}: OverviewKpisProps) {
  const t = useTranslations("admin");
  const kpis = [
    { label: t("overtimeThisWeek"), value: formatDuration(overtimeMinutes), detail: t("acrossTeam"), Icon: Clock },
    {
      label: t("openHazards"),
      value: String(openHazards),
      detail: t("escalatedCount", { count: escalatedHazards }),
      Icon: TriangleAlert,
      alert: escalatedHazards > 0,
    },
    {
      label: t("feedbackMood"),
      value: moodAverage === null ? "—" : `${moodAverage.toFixed(1)} / 3`,
      detail: t("responses", { count: responses }),
      Icon: Smile,
    },
    { label: t("atRiskWorkers"), value: String(tired), detail: t("fatigueRulesBroken"), Icon: Activity },
  ];

  return (
    <ul className="stagger grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
      <li className="col-span-2 lg:col-span-1 lg:row-span-2 xl:row-span-1">
        <div className="hero-card flex h-full min-h-40 flex-col justify-between gap-4 p-5">
          <span className="eyebrow flex items-center gap-2 text-primary-strong">
            <span className="live-dot" aria-hidden="true" />
            {t("onSiteNow")}
          </span>
          <div>
            <span className="figure font-display block text-6xl leading-none font-extrabold text-primary-strong">
              {onSite}
            </span>
            <span className="mt-2 block text-sm text-ink-2">{t("ofWorkers", { count: workerCount })}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/80" aria-hidden="true">
            <div
              className="meter-fill h-full rounded-full bg-primary"
              style={{ width: `${workerCount ? (onSite / workerCount) * 100 : 0}%` }}
            />
          </div>
        </div>
      </li>
      {kpis.map(({ label, value, detail, Icon, alert }) => (
        <li key={label}>
          <div className="card flex h-full flex-col justify-between gap-3 p-4">
            <span className="flex items-start justify-between gap-2">
              <span className="eyebrow">{label}</span>
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl",
                  alert ? "bg-danger text-white" : "bg-surface-2 text-ink",
                )}
              >
                <Icon aria-hidden="true" className="size-4" />
              </span>
            </span>
            <span>
              <span className="figure block text-3xl leading-tight font-bold sm:text-4xl">{value}</span>
              <span className="text-sm text-ink-2">{detail}</span>
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
