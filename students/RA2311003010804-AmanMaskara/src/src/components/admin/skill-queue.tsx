import { useLocale, useTranslations } from "next-intl";
import { BadgeCheck } from "lucide-react";
import type { Skill, Worker } from "@/server/repos/types";
import { formatDay } from "@/lib/format";
import { SkillDecision } from "@/components/admin/decision-buttons";
import { AddSkill } from "@/components/skill-form";

/** Skills waiting for verification, plus "Add a skill" for any worker on the team. */
export function SkillQueue({ queue, workers }: { queue: { skill: Skill; worker: Worker }[]; workers: Worker[] }) {
  const t = useTranslations("admin.peoplePage.skills");
  const locale = useLocale();
  return (
    <section id="skills" aria-labelledby="skills-title" className="flex scroll-mt-24 flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="skills-title" className="font-display text-xl font-extrabold">
            {t("title")}
          </h2>
          <p className="text-sm text-ink-2">{t("hint")}</p>
        </div>
        <AddSkill workers={workers.map((w) => ({ id: w.id, label: `${w.name} (#${w.code})` }))} />
      </div>
      {queue.length === 0 ? (
        <p className="text-ink-2">{t("none")}</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {queue.map(({ skill, worker }) => (
            <li key={skill.id} className="card flex flex-col gap-2 p-4">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-strong"
                >
                  <BadgeCheck className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-bold">{skill.title}</p>
                  <p className="text-sm text-ink-2">
                    {worker.name} · {skill.issuer} · {formatDay(skill.date.toISOString().slice(0, 10), locale)}
                  </p>
                  {skill.evidence && <p className="mt-1 text-sm">{t("evidence", { evidence: skill.evidence })}</p>}
                </div>
              </div>
              <SkillDecision id={skill.id} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
