import { useTranslations } from "next-intl";
import type { FatigueAlert, QuitRiskResult } from "@/core/types";
import { Badge } from "@/components/ui/badge";

/** Explains a quit-risk score: only factors that actually contribute, biggest first. */
export function RiskReasons({ risk }: { risk: QuitRiskResult }) {
  const t = useTranslations("admin.risk");
  const reasons = risk.reasons.filter((r) => r.value > 0).sort((a, b) => b.value * b.weight - a.value * a.weight);
  if (reasons.length === 0) return <span className="text-ink-2">{t("none")}</span>;
  return (
    <ul className="flex flex-wrap gap-1">
      {reasons.map((r) => (
        <li key={r.factor}>
          <Badge>
            {t(r.factor)} +{Math.round(r.value * r.weight)}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

/** One chip per broken fatigue rule (deduplicated). */
export function FatigueReasons({ alerts }: { alerts: FatigueAlert[] }) {
  const t = useTranslations("admin.fatigue");
  const keys = [...new Set(alerts.map((a) => a.messageKey.replace("fatigue.", "")))];
  if (keys.length === 0) return <span className="text-ink-2">{t("none")}</span>;
  return (
    <ul className="flex flex-wrap gap-1">
      {keys.map((key) => (
        <li key={key}>
          <Badge tone="warning">{t(key)}</Badge>
        </li>
      ))}
    </ul>
  );
}

export function riskTone(score: number): "danger" | "warning" | "neutral" {
  return score >= 50 ? "danger" : score >= 30 ? "warning" : "neutral";
}
