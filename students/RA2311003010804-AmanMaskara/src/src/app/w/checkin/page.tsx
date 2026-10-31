import { getTranslations } from "next-intl/server";
import { CloudUpload, QrCode, ScanLine } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { isDemoMode } from "@/server/config";
import { CheckinPanel } from "@/components/worker/checkin-panel";

const STEPS = [
  { key: "step1", Icon: QrCode },
  { key: "step2", Icon: ScanLine },
  { key: "step3", Icon: CloudUpload },
] as const;

export default async function CheckinPage() {
  const session = await requireRole("worker");
  const t = await getTranslations("checkin");
  const checkedIn = (await getRepos().shifts.getByWorker(session.uid)).some((s) => !s.outAt);

  return (
    <div className="flex flex-col gap-6 md:mx-auto md:w-full md:max-w-3xl">
      <CheckinPanel checkedIn={checkedIn} demo={isDemoMode()} />

      {!checkedIn && (
        <section aria-labelledby="how-it-works" className="flex flex-col gap-3">
          <h2 id="how-it-works" className="eyebrow rule-label">
            {t("howTitle")}
          </h2>
          <ol className="stagger grid gap-3 md:grid-cols-3">
            {STEPS.map(({ key, Icon }, i) => (
              <li key={key} className="card flex items-start gap-4 p-4 md:flex-col">
                <span className="figure flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent font-bold text-on-accent">
                  {i + 1}
                </span>
                <span className="flex-1 leading-snug">{t(key)}</span>
                <Icon aria-hidden="true" className="mt-1 size-6 shrink-0 text-ink-2 md:hidden" />
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
