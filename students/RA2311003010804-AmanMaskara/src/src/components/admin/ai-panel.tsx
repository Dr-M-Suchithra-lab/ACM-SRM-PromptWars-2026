import { useTranslations } from "next-intl";
import { Cpu } from "lucide-react";
import type { AiLogEntry } from "@/server/repos/types";
import { cn } from "@/lib/utils";

/** AI transparency: whether Gemini is configured and the last few calls (model, latency, fallback). */
export function AiPanel({ configured, calls }: { configured: boolean; calls: AiLogEntry[] }) {
  const t = useTranslations("admin.ai");
  return (
    <section aria-labelledby="ai-panel" className="card flex flex-col gap-2 p-4 md:p-5">
      <h2 id="ai-panel" className="font-display flex items-center gap-2 text-xl font-extrabold">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary-strong">
          <Cpu aria-hidden="true" className="size-5" />
        </span>
        {t("title")}
      </h2>
      <p className="text-sm text-ink-2">{t("intro")}</p>
      <p
        className={cn(
          "w-fit rounded-full px-3 py-1 text-sm font-bold",
          configured ? "bg-success-soft text-success" : "bg-warning-soft text-warning-ink",
        )}
      >
        {configured ? t("configured") : t("missingKey")}
      </p>
      {calls.length === 0 ? (
        <p className="rounded-2xl bg-surface-2 p-3 text-sm text-ink-2">{t("none")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-ink-2">
              <tr>
                <th className="py-1.5 font-semibold">{t("feature")}</th>
                <th className="py-1.5 font-semibold">{t("model")}</th>
                <th className="py-1.5 font-semibold">{t("latency")}</th>
                <th className="py-1.5 font-semibold">{t("result")}</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((call, i) => (
                <tr key={i} className="border-t border-line align-top">
                  <td className="py-1.5">{t(`features.${call.feature}`)}</td>
                  <td className="py-1.5 font-mono text-xs whitespace-nowrap">{call.model}</td>
                  <td className="figure py-1.5 whitespace-nowrap">{call.latencyMs} ms</td>
                  <td className="py-1.5">
                    {call.error ? (
                      <span className="text-danger">{t("failed")}</span>
                    ) : call.fallbackUsed ? (
                      t("fallback")
                    ) : (
                      t("ok")
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
