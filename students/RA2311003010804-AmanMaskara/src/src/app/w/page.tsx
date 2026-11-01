import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  ArrowUpRight,
  BatteryLow,
  Gift,
  IndianRupee,
  LogIn,
  LogOut,
  MessageCircle,
  Scale,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { earnedFor } from "@/server/services/earned";
import { payCheckFor } from "@/server/services/pay-check";
import { benefitsFor } from "@/server/services/benefits";
import { workerPayoutAccount } from "@/server/services/payouts";
import { getISTDay, getISTWeekStart } from "@/core/time";
import { minutesByDay } from "@/core/overtime";
import { checkFatigue } from "@/core/fatigue";
import { getSectorProfile } from "@/core/sectors";
import { payFocusMonth } from "@/core/period";
import type { ClosedShift } from "@/core/types";
import { getScheme } from "@/config/schemes";
import type { Locale } from "@/i18n/locales";
import { formatDuration, formatRupees } from "@/lib/format";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { SpeakButton } from "@/components/speak-button";
import { todayLabel } from "@/components/page-header";
import { ShiftTimer } from "@/components/worker/shift-timer";
import { CountUp } from "@/components/worker/count-up";
import { BankConfirmCard } from "@/components/worker/bank-confirm-card";
import { GreetingTitle, WelcomeMoment } from "@/components/welcome/welcome";
import { dayPart, istHour } from "@/lib/day-part";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const ACTIONS = [
  { href: "/w/pay", key: "pay", Icon: IndianRupee, tone: "bg-accent-soft text-warning-ink" },
  { href: "/w/report", key: "report", Icon: TriangleAlert, tone: "bg-danger-soft text-danger" },
  { href: "/w/feedback", key: "feedback", Icon: MessageCircle, tone: "bg-primary-soft text-primary-strong" },
  { href: "/w/skills", key: "skills", Icon: UserRound, tone: "bg-info-soft text-[#2558b5]" },
] as const;

function formatTimeIST(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(
    date,
  );
}

export default async function WorkerHome({ searchParams }: PageProps<"/w">) {
  const session = await requireRole("worker");
  const [t, locale, params] = await Promise.all([
    getTranslations("worker"),
    getLocale() as Promise<Locale>,
    searchParams,
  ]);
  const repos = getRepos();
  const now = new Date();
  const [worker, shifts, org, earned, check, benefits, bank] = await Promise.all([
    repos.workers.getById(session.uid),
    repos.shifts.getByWorker(session.uid),
    repos.orgs.getById(session.orgId),
    earnedFor(repos, session.uid, now),
    payCheckFor(repos, session.uid, payFocusMonth(now)),
    benefitsFor(repos, session.uid, now),
    workerPayoutAccount(repos, session.uid),
  ]);

  const today = getISTDay(now);
  const weekStart = getISTWeekStart(now);
  const openShift = shifts.find((s) => !s.outAt);
  const asClosed: ClosedShift[] = shifts.map((s) => ({ ...s, outAt: s.outAt ?? now }));
  const byDay = minutesByDay(asClosed.filter((s) => getISTDay(s.outAt) >= weekStart));
  const todayMinutes = byDay.get(today) ?? 0;
  const weekMinutes = [...byDay.entries()].filter(([day]) => day >= weekStart).reduce((sum, [, m]) => sum + m, 0);
  const profile = org ? getSectorProfile(org.sector) : null;
  const weekLimit = profile?.labourRules.weeklyHrs ?? 48;
  const weekShare = Math.min(1, weekMinutes / (weekLimit * 60));
  const overLimit = weekMinutes > weekLimit * 60;

  // Only the last 7 days, so the nudge is about recent strain, not old history.
  const recent = shifts.filter(
    (s): s is ClosedShift => Boolean(s.outAt) && now.getTime() - s.inAt.getTime() <= SEVEN_DAYS_MS,
  );
  const fatigueKeys = profile
    ? [...new Set(checkFatigue(recent, profile.fatigueRules, now).map((a) => a.messageKey))]
    : [];

  const firstName = worker?.name.split(" ")[0] ?? "";
  const greeting = t("greeting", { name: firstName });
  const status = openShift ? t("statusCheckedIn", { time: formatTimeIST(openShift.inAt) }) : t("statusNotCheckedIn");
  const hours = t("todayHours", { hours: Math.floor(todayMinutes / 60), minutes: todayMinutes % 60 });
  const weekText = t("weekOfLimit", { used: formatDuration(weekMinutes), limit: weekLimit });
  const monthGross = earned?.monthGross ?? 0;
  const earnedText = t("earned.spoken", {
    amount: formatRupees(monthGross),
    today: formatRupees(earned?.todayGross ?? 0),
  });
  const shortfall = check?.outstanding ?? 0;
  const closest = benefits?.results
    .filter((r) => r.daysRemaining > 0 && r.progress.done > 0 && r.progress.needed > 1)
    .sort((a, b) => a.daysRemaining - b.daysRemaining)[0];

  return (
    <WelcomeMoment
      active={params.welcome === "1"}
      variant="worker"
      part={dayPart(istHour(now))}
      greeting={t("welcomeGreeting", { name: firstName })}
      line={`${openShift ? status : t("welcomeReady")} · ${t("earned.welcomeLine", { amount: formatRupees(monthGross) })}`}
    >
      <div className="flex flex-col gap-5 md:grid md:grid-cols-[1.1fr_1fr] md:items-start md:gap-x-8 md:gap-y-6">
        <header className="flex items-start justify-between gap-3 md:col-span-2">
          <div className="flex flex-col gap-1">
            <p className="eyebrow">{todayLabel(locale)}</p>
            <GreetingTitle className="font-display text-[2.2rem] leading-[1.05] font-extrabold md:text-5xl">
              {greeting}
            </GreetingTitle>
          </div>
          <SpeakButton text={`${greeting}. ${status}. ${hours}. ${earnedText}`} />
        </header>

        <div className="stagger flex flex-col gap-4">
          {bank && bank.status !== "confirmed" && <BankConfirmCard account={bank} employer={org?.name ?? ""} />}
          <section aria-labelledby="earned-title" className="hero-card flex flex-col gap-3 p-5 md:p-7">
            <div className="flex items-start justify-between gap-3">
              <h2 id="earned-title" className="eyebrow text-primary-strong">
                {t("earned.title")}
              </h2>
              <SpeakButton text={earnedText} className="-mt-2 -mr-2 bg-white/70" />
            </div>
            <p
              className="figure font-display text-[3.1rem] leading-none font-extrabold text-primary-strong md:text-6xl"
              data-testid="earned-month"
            >
              <CountUp paise={monthGross} />
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {(earned?.todayGross ?? 0) > 0 && (
                <span className="figure rounded-full bg-accent px-3 py-1 font-bold text-on-accent">
                  {t("earned.today", { amount: formatRupees(earned!.todayGross) })}
                </span>
              )}
              <span className="text-ink-2">{t("earned.beforeDeductions")}</span>
            </div>
          </section>

          <section aria-labelledby="today-card" className="card flex flex-col gap-5 p-5 md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="today-card" className="eyebrow">
                {t("today")}
              </h2>
              <span
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold",
                  openShift ? "bg-success-soft text-success" : "bg-surface-2 text-ink-2",
                )}
              >
                {openShift ? (
                  <span className="live-dot" aria-hidden="true" />
                ) : (
                  <span aria-hidden="true" className="size-2 rounded-full bg-ink-2/50" />
                )}
                {status}
              </span>
            </div>

            {openShift ? (
              <div>
                <p className="text-sm font-bold text-ink-2">{t("onShiftFor")}</p>
                <p className="mt-1 text-[2.8rem] leading-none font-bold">
                  <ShiftTimer since={openShift.inAt.toISOString()} />
                </p>
                <p className="sr-only">{hours}</p>
              </div>
            ) : (
              <p className="figure text-[2.8rem] leading-none font-bold" aria-label={hours}>
                {formatDuration(todayMinutes)}
              </p>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-sm">
                <span className="font-bold">{t("thisWeek")}</span>
                <span className="figure text-ink-2">{weekText}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                <div
                  className={cn("meter-fill h-full rounded-full", overLimit ? "bg-danger" : "bg-primary")}
                  style={{ width: `${Math.max(weekShare * 100, 2)}%` }}
                />
              </div>
            </div>

            <Link
              href="/w/checkin"
              className={cn(buttonVariants({ variant: openShift ? "outline" : "primary", size: "lg" }), "w-full")}
            >
              {openShift ? (
                <LogOut aria-hidden="true" className="size-6" />
              ) : (
                <LogIn aria-hidden="true" className="size-6" />
              )}
              {openShift ? t("tiles.checkout") : t("tiles.checkin")}
            </Link>
          </section>

          {fatigueKeys.length > 0 && (
            <section role="alert" className="card flex items-start gap-3 border-warning/30 bg-warning-soft p-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-warning text-white">
                <BatteryLow aria-hidden="true" className="size-6" />
              </span>
              <div className="flex-1">
                <p className="font-bold">{t("fatigue.title")}</p>
                {fatigueKeys.map((key) => (
                  <p key={key} className="text-ink-2">
                    {t(key)}
                  </p>
                ))}
              </div>
              <SpeakButton text={[t("fatigue.title"), ...fatigueKeys.map((key) => t(key))].join(". ")} />
            </section>
          )}
        </div>

        <div className="stagger flex flex-col gap-3">
          {shortfall > 0 && (
            <Link href="/w/pay" className="tile flex items-center gap-3 border-danger/25 bg-danger-soft p-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-danger text-white">
                <Scale aria-hidden="true" className="size-6" />
              </span>
              <span className="flex-1">
                <span className="block font-extrabold">
                  {t("nudge.shortfall", { amount: formatRupees(shortfall) })}
                </span>
                <span className="block text-sm text-ink-2">{t("nudge.shortfallHint")}</span>
              </span>
              <ArrowUpRight aria-hidden="true" className="nudge size-5 text-ink-2" />
            </Link>
          )}
          {closest && (
            <Link href="/w/skills#benefits" className="tile flex items-center gap-3 p-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-success-soft text-success">
                <Gift aria-hidden="true" className="size-6" />
              </span>
              <span className="flex-1">
                <span className="block font-extrabold">{getScheme(closest.schemeId)?.name[locale]}</span>
                <span className="figure block text-sm text-ink-2">
                  {t("nudge.benefitProgress", { done: closest.progress.done, needed: closest.progress.needed })}
                </span>
              </span>
              <ArrowUpRight aria-hidden="true" className="nudge size-5 text-ink-2" />
            </Link>
          )}

          <h2 className="eyebrow rule-label mt-2">{t("quickActions")}</h2>
          <ul className="grid grid-cols-2 gap-3">
            {ACTIONS.map(({ href, key, Icon, tone }) => (
              <li key={href}>
                <Link href={href} className="tile flex h-full min-h-36 flex-col justify-between gap-4 p-4">
                  <span className="flex items-start justify-between">
                    <span className={cn("flex size-12 items-center justify-center rounded-2xl", tone)}>
                      <Icon aria-hidden="true" className="size-6" />
                    </span>
                    <ArrowUpRight aria-hidden="true" className="nudge size-5 text-ink-2" />
                  </span>
                  <span>
                    <span className="block text-lg leading-tight font-extrabold">{t(`tiles.${key}`)}</span>
                    <span className="mt-1 block text-sm leading-snug text-ink-2">{t(`tileHints.${key}`)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </WelcomeMoment>
  );
}
