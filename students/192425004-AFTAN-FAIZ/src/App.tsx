import { ShiftCalendar } from "./components/ShiftCalendar";
import { ReadAloud } from "./components/ReadAloud";
import { assistanceCopy, riskLabels } from "./lib/assistance";
import { zonedDateTimeToIso } from "../shared/timezone";
import {
  AuthExperience,
  AuthCallback,
  LegalPage,
  authStorage,
} from "./components/AuthExperience";
import {
  Onboarding,
  InvitationExperience,
  WorkforceManagement,
  BusinessOverview,
} from "./components/BusinessExperience";
import {
  useCallback,
  useEffect,
  useState,
  useRef,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import {
  createClient,
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  CalendarDays,
  Wallet,
  ShieldCheck,
  ShieldAlert,
  Activity,
  LayoutDashboard,
  UsersRound,
  Settings2,
  LogOut,
  Languages,
  Menu,
  X,
  Sparkles,
  Fingerprint,
  HardHat,
  HeartPulse,
  CircleHelp,
  CircleCheck,
  Play,
  Plus,
  RefreshCw,
  FileCheck2,
  MessageSquareText,
  LockKeyhole,
  TrendingUp,
  Radio,
  Sun,
  Eye,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { PolicyEditor } from "./components/PolicyEditor";
import { Field } from "./components/Field";
import { ApiError, requestApi } from "./lib/api";
import { Modal } from "./components/ui/dialog";
import { dictionaries, type Language, type TextKey } from "./i18n";
import {
  money,
  restWindow,
  calculatePay,
  policyInput,
  type Policy,
} from "../shared/engines";
import type { Workspace, WorkShift, SafetyEvent, Pay } from "./types";

type Config = {
  url: string;
  publishableKey: string;
  demoEnabled: boolean;
  aiConfigured: boolean;
  saasEnabled?: boolean;
  googleEnabled?: boolean;
};
type ModalState = {
  type: "clarify" | "replay" | "review" | "resolve" | "safety" | "shift";
  id?: string;
} | null;
type Tracking = {
  reference: string;
  category: string;
  status: string;
  created_at: string;
  events: SafetyEvent[];
};
const safetyStates = [
  "submitted",
  "acknowledged",
  "under_review",
  "action_assigned",
  "mitigated",
  "closed",
];
const human = (s: string) =>
  s.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
const iconFor = {
  home: LayoutDashboard,
  shifts: CalendarDays,
  pay: Wallet,
  report: ShieldAlert,
  cases: FileCheck2,
  profile: UsersRound,
  workforce: UsersRound,
  payroll: Wallet,
  disputes: MessageSquareText,
  safety: ShieldCheck,
  rest: Activity,
  analytics: TrendingUp,
  settings: Settings2,
};
function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      className={`brand ${light ? "brand-light" : ""}`}
      to="/"
      aria-label="NYAVERIS AI home"
    >
      <span className="brand-symbol" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className="brand-wordmark">
        NYAVERIS<span className="brand-ai"> AI</span>
      </span>
    </Link>
  );
}
function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <CircleCheck size={30} />
      <p>{children}</p>
    </div>
  );
}
function ProgressLine() {
  return (
    <div className="proof-line">
      <span>
        <Check size={13} />
      </span>
      <i />
      <span>
        <Check size={13} />
      </span>
      <i />
      <span>
        <Eye size={13} />
      </span>
      <i className="dashed" />
      <span className="inactive">
        <CheckCheck size={13} />
      </span>
    </div>
  );
}

export default function App() {
  const [caseFilter, setCaseFilter] = useState("all"),
    [safetyFilter, setSafetyFilter] = useState("open");
  const [shiftSearch, setShiftSearch] = useState("");
  const [credentials, setCredentials] = useState<{
      reference: string;
      token: string;
    } | null>(null),
    [tracking, setTracking] = useState<Tracking | null>(null),
    [safetyTab, setSafetyTab] = useState("submit");
  const [demoOrgs, setDemoOrgs] = useState<{ id: string; name: string }[]>([]);
  const [whatif, setWhatif] = useState<{ id: string; hour: number } | null>(
    null,
  );
  const [language, setLanguage] = useState<Language>(
    () => (localStorage.getItem("fairshift-language") as Language) || "en",
  );
  const t = dictionaries[language] || dictionaries.en;
  const [authReady, setAuthReady] = useState(false);
  const [config, setConfig] = useState<Config | null>(null),
    [client, setClient] = useState<SupabaseClient | null>(null),
    [session, setSession] = useState<Session | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<
    { business_name: string }[]
  >([]);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [workspace, setWorkspace] = useState<Workspace | null>(null),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [mobile, setMobile] = useState(false);
  const [modal, setModal] = useState<ModalState>(null),
    [assistant, setAssistant] = useState<{
      explanation: string;
      nextAction: string;
      source: string;
      topic?: "pay" | "rest" | "safety" | "cases";
      actionPath?: string;
    } | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantTopic, setAssistantTopic] = useState<
    "pay" | "rest" | "safety" | "cases"
  >("pay");
  const [assistantAsked, setAssistantAsked] = useState("");
  const [assistantHistory, setAssistantHistory] = useState<
    { question: string; answer: string }[]
  >([]);
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [assistantError, setAssistantError] = useState("");
  const [restShiftId, setRestShiftId] = useState("");
  const assistantGeneration = useRef(0);
  const lastAssistantRequest = useRef<{
    topic: "pay" | "rest" | "safety" | "cases";
    question?: string;
  }>({ topic: "pay" });
  const navigate = useNavigate();
  const loadGeneration = useRef(0);
  const currentUser = useRef(session?.user.id);
  currentUser.current = session?.user.id;
  const currentSession = useRef(session);
  currentSession.current = session;
  useEffect(() => {
    assistantGeneration.current++;
    setAssistant(null);
    setAssistantHistory([]);
    setAssistantQuestion("");
    setAssistantError("");
    setAssistantBusy(false);
    setRestShiftId("");
  }, [session?.user.id, selectedOrg, language]);
  useEffect(() => {
    // A shared browser must not carry anonymous tracking secrets across identities.
    setCredentials(null);
    setTracking(null);
    setSafetyTab("submit");
    setAssistant(null);
    setAssistantOpen(false);
    setModal(null);
    loadGeneration.current++;
    setWorkspace(null);
    setLoading(false);
  }, [session?.user.id]);
  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem("fairshift-language", language);
    setAssistant(null);
  }, [language]);
  useEffect(() => {
    let dispose: () => void = () => {};
    let active = true;
    fetch("/api/config", { signal: AbortSignal.timeout(15000) })
      .then((r) => {
        if (!r.ok) throw new Error("Configuration unavailable");
        return r.json();
      })
      .then(async (c: Config) => {
        if (!active) return;
        setConfig(c);
        if (!c.url || !c.publishableKey) {
          setAuthReady(true);
          return;
        }
        const s = createClient(c.url, c.publishableKey, {
          auth: {
            flowType: "pkce",
            detectSessionInUrl: false,
            storage: authStorage,
          },
        });
        const result = await s.auth.getSession();
        if (!active) return;
        setSession(result.data.session);
        const sub = s.auth.onAuthStateChange((_event, current) =>
          setSession(current),
        );
        dispose = () => sub.data.subscription.unsubscribe();
        setClient(s);
        setAuthReady(true);
      })
      .catch(() => {
        if (active) {
          setError("Cannot reach the NYAVERIS AI service. Please retry.");
          setConfig({
            url: "",
            publishableKey: "",
            demoEnabled: false,
            aiConfigured: false,
          });
          setAuthReady(true);
        }
      });
    return () => {
      active = false;
      dispose();
    };
  }, []);
  useEffect(() => {
    if (config?.demoEnabled)
      fetch("/api/demo-organizations")
        .then((r) => r.json())
        .then(setDemoOrgs)
        .catch(() => {});
  }, [config]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const api = useCallback(
    async <T,>(path: string, body?: unknown) => {
      const token = session?.access_token;
      try {
        return await requestApi<T>(path, body, token);
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.status === 401 &&
          token &&
          currentSession.current?.access_token === token
        ) {
          // Clear only the rejected session, never a newer login or refreshed token.
          if (client) await client.auth.signOut({ scope: "local" });
          if (currentSession.current?.access_token === token) {
            setSession(null);
            setWorkspace(null);
          }
        }
        throw error;
      }
    },
    [session, client],
  );
  const reload = useCallback(async () => {
    if (!session || currentUser.current !== session.user.id) return;
    const generation = ++loadGeneration.current;
    const isCurrent = () =>
      generation === loadGeneration.current &&
      currentUser.current === session.user.id;
    setLoading(true);
    setError("");
    try {
      const account = await api<{
        memberships: { organization_id: string }[];
        pendingInvitations?: { business_name: string }[];
      }>("/account");
      if (isCurrent()) setPendingInvitations(account.pendingInvitations ?? []);
      if (!account.memberships.length) {
        if (isCurrent()) {
          setNeedsOnboarding(true);
          setWorkspace(null);
        }
        return;
      }
      if (isCurrent()) setNeedsOnboarding(false);
      const activeOrg =
        account.memberships.find((m) => m.organization_id === selectedOrg)
          ?.organization_id ?? account.memberships[0].organization_id;
      const data = await api<Workspace>("/workspace?org=" + activeOrg);
      if (isCurrent()) setWorkspace(data);
    } catch (e) {
      if (isCurrent()) setError((e as Error).message);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [api, session, selectedOrg]);
  useEffect(() => {
    if (session) void reload();
    else setWorkspace(null);
  }, [session, reload]);
  async function run(action: () => Promise<void>, message = t.actionSaved) {
    setBusy(true);
    setError("");
    try {
      await action();
      setToast(message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function demo(
    role: "worker" | "admin",
    sector: "construction" | "healthcare" = "construction",
  ) {
    await run(async () => {
      if (!client) throw new Error("Supabase is not configured");
      const s = await api<{ access_token: string; refresh_token: string }>(
        "/demo-session",
        { role, sector },
      );
      const result = await client.auth.setSession(s);
      if (result.error) throw result.error;
      setWorkspace(null);
      setModal(null);
      setAssistant(null);
      navigate("/app/home");
    }, t.demo);
  }
  async function mutate(path: string, body: unknown) {
    await api(path, body);
    setModal(null);
    await reload();
  }
  async function ask(
    topic: "pay" | "rest" | "safety" | "cases" = "pay",
    question?: string,
  ) {
    const generation = ++assistantGeneration.current;
    lastAssistantRequest.current = { topic, question };
    setAssistantOpen(true);
    setAssistantTopic(topic);
    setAssistantBusy(true);
    setAssistantError("");
    if (assistant)
      setAssistantHistory((old) =>
        [
          ...old,
          { question: assistantAsked, answer: assistant.explanation },
        ].slice(-6),
      );
    setAssistant(null);
    setAssistantAsked(question || t[topic === "safety" ? "report" : topic]);
    try {
      const answer = await api<NonNullable<typeof assistant>>("/assistant", {
        topic,
        language,
        ...(selectedOrg ? { organization_id: selectedOrg } : {}),
        ...(question ? { question } : {}),
        ...(topic === "pay" && !question && focusShift
          ? { shift_id: focusShift.id }
          : {}),
      });
      if (generation === assistantGeneration.current) {
        setAssistant(answer);
        setAssistantTopic(answer.topic || topic);
        setAssistantQuestion("");
      }
    } catch {
      if (generation === assistantGeneration.current)
        setAssistantError(assistanceCopy[language].unavailable);
    } finally {
      if (generation === assistantGeneration.current) setAssistantBusy(false);
    }
  }
  const org = workspace?.organizations[0],
    admin = workspace?.member.role === "admin";
  const focusedPay = workspace?.pay
    .filter((p) => p.hasPayroll)
    .sort((a, b) => b.discrepancyPaise - a.discrepancyPaise)[0];
  const focusShift = workspace?.shifts.find(
    (s) => s.id === focusedPay?.shiftId,
  );
  const selectedShift = workspace?.shifts.find((s) => s.id === modal?.id);
  const selectedDispute = workspace?.pay_disputes.find(
    (d) => d.id === modal?.id,
  );
  const selectedSafety = workspace?.safety_reports.find(
    (s) => s.id === modal?.id,
  );
  const selectedPay = workspace?.pay.find(
    (p) => p.shiftId === (selectedShift?.id || selectedDispute?.shift_id),
  );
  const fmt = (
    date: string,
    options: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    },
  ) =>
    new Intl.DateTimeFormat(
      language === "ta" ? "ta-IN" : language === "hi" ? "hi-IN" : "en-IN",
      {
        timeZone: workspace?.pay_policies[0]?.timezone || "Asia/Kolkata",
        ...options,
      },
    ).format(new Date(date));
  const time = (date: string) =>
    fmt(date, { hour: "numeric", minute: "2-digit" });
  const LanguageSelect = () => (
    <label className="language-select">
      <Languages size={16} />
      <span className="sr-only">{t.language}</span>
      <select
        aria-label={t.language}
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
      >
        <option value="en">English</option>
        <option value="ta">தமிழ்</option>
        <option value="hi">हिन्दी</option>
      </select>
    </label>
  );
  const notifyError = error && (
    <div className="error-banner" role="alert">
      <ShieldAlert size={18} />
      <span>{error}</span>
      <button onClick={() => setError("")} aria-label="Dismiss error">
        <X size={16} />
      </button>
    </div>
  );
  function openReview(shift: WorkShift) {
    setModal({ type: "review", id: shift.id });
  }
  const currencyStat = (key: TextKey, value: number, tone?: string) => (
    <div className={`stat-card ${tone || ""}`}>
      <span>{t[key]}</span>
      <strong>{money(value)}</strong>
      <small>
        <span className="status-dot" /> {t.tracked} · FairPay Twin
      </small>
    </div>
  );
  const PayCard = ({ p, s }: { p: Pay; s: WorkShift }) => {
    const d = workspace?.pay_disputes.find(
      (d) => d.shift_id === s.id && d.status !== "closed",
    );
    return (
      <article className="card pay-record">
        <div className="section-head">
          <div>
            <span className="eyebrow">
              {fmt(s.starts_at, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <h3>{s.location}</h3>
          </div>
          <Badge tone={p.discrepancyPaise > 0 ? "amber" : "green"}>
            {p.hasPayroll ? money(p.discrepancyPaise) : t.noPayroll}
          </Badge>
        </div>
        <div className="pay-comparison">
          <div>
            <span>{t.expected}</span>
            <strong>{money(p.expectedPaise)}</strong>
          </div>
          <ArrowRight size={19} />
          <div>
            <span>{t.recorded}</span>
            <strong>{p.hasPayroll ? money(p.recordedPaise) : "—"}</strong>
          </div>
        </div>
        <div className="breakdown">
          <div>
            <span>
              {t.regular} · {p.regularMinutes / 60}h
            </span>
            <b>{money(p.regularPaise)}</b>
          </div>
          <div>
            <span>
              {t.overtime} · {p.overtimeMinutes / 60}h
            </span>
            <b>{money(p.overtimePaise)}</b>
          </div>
          <div>
            <span>{t.break}</span>
            <b>{s.break_minutes} min</b>
          </div>
        </div>
        <p className="caption">{t.policyNote}</p>
        <div className="button-row">
          <Button
            variant="outline"
            onClick={() => setModal({ type: "replay", id: s.id })}
          >
            <Play size={15} />
            {t.replay}
          </Button>
          {!admin &&
            p.hasPayroll &&
            !d &&
            p.discrepancyPaise !== 0 &&
            s.confirmed && (
              <Button onClick={() => openReview(s)}>
                {t.request}
                <ArrowUpRight size={15} />
              </Button>
            )}
          {d && <Badge tone="blue">{t[d.status]}</Badge>}
          {!s.confirmed && !admin && (
            <Button
              disabled={busy}
              onClick={() =>
                void run(() => mutate("/shifts/confirm", { shift_id: s.id }))
              }
            >
              {t.confirm}
            </Button>
          )}
        </div>
      </article>
    );
  };
  function Home() {
    if (!workspace) return null;
    const w = workspace;
    const next =
      w.shifts
        .filter((s) => Date.parse(s.ends_at) > Date.now())
        .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))[0] ||
      w.shifts.at(-1);
    const payroll = w.pay.filter((p) => p.hasPayroll);
    const gap = payroll.reduce(
      (n, p) => n + Math.max(0, p.discrepancyPaise),
      0,
    );
    const open = w.pay_disputes.filter((d) => d.status !== "closed");
    const safety = w.safety_reports.filter((s) => s.status !== "closed");
    return (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <Sun size={15} />{" "}
              {fmt(new Date().toISOString(), {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
            <h1>
              {admin
                ? t.home
                : `${t.greeting}, ${w.member.display_name.split(" ")[0]}`}
              <span className="heading-dot">.</span>
            </h1>
            <p>{admin ? t.overview : t.subtitle}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => void reload()}
            disabled={loading}
          >
            <RefreshCw size={16} />
            {t.refresh}
          </Button>
        </div>
        <section className="welcome-banner">
          <div className="banner-copy">
            <div className="banner-kicker">
              <span className="status-dot" /> FAIRNESS, IN FOCUS
            </div>
            <h2>{admin ? t.overview : t.welcome}</h2>
            <p>{t.how}</p>
            <Button
              variant="accent"
              onClick={() => navigate("/app/" + (admin ? "disputes" : "pay"))}
            >
              {admin ? t.actionQueue : t.viewPay}
              <ArrowUpRight size={17} />
            </Button>
          </div>
          <div className="orbit-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orbit-center">
              <ShieldCheck size={43} />
            </div>
            <span className="orbit-label label-one">
              <CheckCheck size={15} /> Hours confirmed
            </span>
            <span className="orbit-label label-two">
              <Fingerprint size={16} /> ProofLoop connected
            </span>
            <span className="star star-one">✦</span>
            <span className="star star-two">+</span>
          </div>
        </section>
        <div className="stats-grid">
          {admin ? (
            <>
              <Metric
                title={t.activeWorkers}
                value={
                  w.organization_members.filter(
                    (m) => m.role === "worker" && m.active !== false,
                  ).length
                }
                icon={<UsersRound size={19} />}
                note={org?.name}
              />
              <Metric
                title={t.openReviews}
                value={open.length}
                icon={<MessageSquareText size={19} />}
                note={`${money(gap)} ${t.difference.toLowerCase()}`}
                tone="amber"
              />
              <Metric
                title={t.openSafety}
                value={safety.length}
                icon={<ShieldCheck size={19} />}
                note={t.featureTwo}
              />
              <Metric
                title={t.risks}
                value={w.risks.length}
                icon={<Activity size={19} />}
                note={t.featureThree}
              />
            </>
          ) : (
            <>
              {currencyStat(
                "expected",
                payroll.reduce((n, p) => n + p.expectedPaise, 0),
              )}
              {currencyStat(
                "recorded",
                payroll.reduce((n, p) => n + p.recordedPaise, 0),
              )}
              {currencyStat("difference", gap, "stat-warning")}
              <Metric
                title={t.openReviews}
                value={open.length}
                icon={<FileCheck2 size={19} />}
                note={t.featureOne}
              />
            </>
          )}
        </div>
        <div className="dashboard-columns">
          <section className="card fairness-feature">
            <div className="section-head">
              <div>
                <div className="eyebrow teal">
                  <Fingerprint size={16} /> FAIRPAY TWIN
                </div>
                <h2>{admin ? t.actionQueue : t.paycheck}</h2>
              </div>
              <Badge tone="green">
                <span className="status-dot" /> Live records
              </Badge>
            </div>
            {focusedPay && focusShift ? (
              <>
                <div className="twin-vis">
                  <div className="twin-record">
                    <span className="mini-icon">
                      <Clock3 size={18} />
                    </span>
                    <small>{t.work}</small>
                    <b>
                      {focusedPay.payableMinutes / 60}
                      <em> hrs</em>
                    </b>
                    <span>{t.verified}</span>
                  </div>
                  <div className="twin-connector">
                    <i />
                    <span>
                      <Fingerprint size={23} />
                    </span>
                    <i />
                  </div>
                  <div className="twin-record">
                    <span className="mini-icon">
                      <Wallet size={18} />
                    </span>
                    <small>{t.expected}</small>
                    <b>{money(focusedPay.expectedPaise)}</b>
                    <span>
                      {focusedPay.regularMinutes / 60}h +{" "}
                      {focusedPay.overtimeMinutes / 60}h overtime
                    </span>
                  </div>
                </div>
                <div
                  className={
                    focusedPay.discrepancyPaise > 0
                      ? "discrepancy-callout"
                      : "success-callout"
                  }
                >
                  <span className="callout-icon">
                    {focusedPay.discrepancyPaise > 0 ? (
                      <CircleHelp size={22} />
                    ) : (
                      <CircleCheck size={22} />
                    )}
                  </span>
                  <div>
                    <strong>
                      {focusedPay.discrepancyPaise > 0
                        ? `${money(focusedPay.discrepancyPaise)} · ${t.reviewAction}`
                        : t.clear}
                    </strong>
                    <p>
                      {t.recorded}: {money(focusedPay.recordedPaise)} ·{" "}
                      {t.expected}: {money(focusedPay.expectedPaise)}
                    </p>
                  </div>
                </div>
                <ProgressLine />
                <div className="proof-labels">
                  <span>Work recorded</span>
                  <span>Hours confirmed</span>
                  <span>Fairness check</span>
                  <span>Resolution</span>
                </div>
                <div className="card-footer">
                  <span>
                    <LockKeyhole size={14} /> {t.proofSub}
                  </span>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setModal({ type: "replay", id: focusShift.id })
                    }
                  >
                    {t.replay}
                    <ArrowRight size={15} />
                  </Button>
                </div>
              </>
            ) : (
              <Empty>{t.noPayroll}</Empty>
            )}
          </section>
          <div className="side-stack">
            <section className="card shift-highlight">
              <div className="section-head">
                <h3>{t.today}</h3>
                <CalendarDays size={20} />
              </div>
              {next ? (
                <>
                  <Badge tone="blue">
                    {org?.sector_id === "construction" ? (
                      <HardHat size={13} />
                    ) : (
                      <HeartPulse size={13} />
                    )}{" "}
                    {org?.sector_id === "construction"
                      ? t.construction
                      : t.healthcare}
                  </Badge>
                  <h2>
                    {time(next.starts_at)} <span>—</span> {time(next.ends_at)}
                  </h2>
                  <p>{next.location}</p>
                  <div className="shift-meta">
                    <span>
                      <CalendarDays size={15} />
                      {fmt(next.starts_at, { day: "numeric", month: "short" })}
                    </span>
                    <span>
                      <Clock3 size={15} />
                      {next.break_minutes} min {t.break.toLowerCase()}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/app/shifts")}
                  >
                    {t.shifts}
                    <ArrowRight size={15} />
                  </Button>
                </>
              ) : (
                <Empty>{t.noShifts}</Empty>
              )}
            </section>
            <section className="assistant-card">
              <div className="assistant-mark">
                <Sparkles size={23} />
              </div>
              <div>
                <h3>
                  {t.assistant}
                  <Badge>AI</Badge>
                </h3>
                <p>{t.assistSub}</p>
                <button onClick={() => void ask("pay")}>
                  {t.explain}
                  <ArrowUpRight size={15} />
                </button>
              </div>
              <span className="ai-decoration">✧</span>
            </section>
          </div>
        </div>
        <div className="dashboard-columns lower-grid">
          <section className="card">
            <div className="section-head">
              <h3>{t.recent}</h3>
              <Link to="/app/cases">
                {t.viewAll}
                <ArrowUpRight size={14} />
              </Link>
            </div>
            {w.dispute_events
              .slice()
              .sort(
                (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
              )
              .slice(0, 3)
              .map((e) => (
                <div className="activity-row" key={e.id}>
                  <span className="activity-icon">
                    <FileCheck2 size={18} />
                  </span>
                  <div>
                    <strong>{human(e.event_type)}</strong>
                    <p>{e.explanation}</p>
                  </div>
                  <small>
                    {fmt(e.created_at, { day: "numeric", month: "short" })}
                  </small>
                </div>
              ))}
          </section>
          <section className="safety-promo">
            <span className="mini-icon">
              <ShieldCheck size={24} />
            </span>
            <h3>{t.rights}</h3>
            <p>{t.concernSub}</p>
            <Button variant="outline" onClick={() => navigate("/app/report")}>
              {t.report}
              <ArrowUpRight size={15} />
            </Button>
          </section>
        </div>
      </>
    );
  }
  function Metric({
    title,
    value,
    icon,
    note,
    tone = "",
  }: {
    title: string;
    value: number | string;
    icon: ReactNode;
    note?: string;
    tone?: string;
  }) {
    return (
      <div className={`stat-card metric ${tone}`}>
        <div>
          <span>{title}</span>
          <i>{icon}</i>
        </div>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    );
  }
  function PageTitle({
    title,
    subtitle,
    action,
  }: {
    title: string;
    subtitle?: string;
    action?: ReactNode;
  }) {
    return (
      <div className="page-heading">
        <div>
          <div className="eyebrow teal">
            NYAVERIS AI / {org?.sector_id.toUpperCase()}
          </div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
    );
  }
  function PayPage() {
    return (
      <>
        <PageTitle
          title={t.payTitle}
          subtitle={t.paySubtitle}
          action={
            <Button variant="outline" onClick={() => void ask("pay")}>
              <Sparkles size={16} />
              {t.explain}
            </Button>
          }
        />
        <div className="info-strip">
          <ShieldCheck size={19} />
          {t.policyNote}
        </div>
        <div className="records-grid">
          {workspace?.shifts
            .slice()
            .sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at))
            .map((s) => (
              <PayCard
                key={s.id}
                s={s}
                p={workspace.pay.find((p) => p.shiftId === s.id)!}
              />
            ))}
        </div>
      </>
    );
  }
  function ShiftsPage() {
    return (
      <>
        <PageTitle
          title={t.shifts}
          subtitle={t.shiftPolicy}
          action={
            admin && (
              <Button onClick={() => setModal({ type: "shift" })}>
                <Plus size={16} />
                {t.newShift}
              </Button>
            )
          }
        />
        {!org?.is_demo && workspace && (
          <ShiftCalendar workspace={workspace} onSelect={setShiftSearch} />
        )}
        <Field label="Filter shifts by date, employee or location">
          <input
            type="search"
            value={shiftSearch}
            onChange={(e) => setShiftSearch(e.target.value)}
          />
        </Field>
        <section className="card table-card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t.date}</th>
                  <th>{t.location}</th>
                  <th>{t.hours}</th>
                  <th>{t.status}</th>
                  <th>{t.details}</th>
                </tr>
              </thead>
              <tbody>
                {workspace?.shifts
                  .filter((s) =>
                    `${new Intl.DateTimeFormat("en-CA", { timeZone: workspace.pay_policies[0].timezone }).format(new Date(s.starts_at))} ${fmt(s.starts_at)} ${s.location} ${workspace.organization_members.find((m) => m.user_id === s.worker_id)?.display_name}`
                      .toLowerCase()
                      .includes(shiftSearch.toLowerCase()),
                  )
                  .slice()
                  .sort(
                    (a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at),
                  )
                  .map((s) => (
                    <tr key={s.id}>
                      <td>
                        <b>
                          {fmt(s.starts_at, { day: "numeric", month: "short" })}
                        </b>
                        <small>
                          {time(s.starts_at)} – {time(s.ends_at)}
                        </small>
                      </td>
                      <td>{s.location}</td>
                      <td>
                        {calculatePay(s, workspace.pay_policies[0])
                          .payableMinutes / 60}
                        h
                        <small>
                          {s.break_minutes} min {t.break}
                        </small>
                      </td>
                      <td>
                        <Badge tone={s.confirmed ? "green" : "blue"}>
                          {s.confirmed ? t.verified : t.scheduled}
                        </Badge>
                      </td>
                      <td>
                        <div className="button-row">
                          <Button
                            variant="ghost"
                            onClick={() =>
                              setModal({ type: "replay", id: s.id })
                            }
                          >
                            {t.replay}
                          </Button>
                          {admin &&
                            config?.saasEnabled &&
                            !org?.is_demo &&
                            !s.confirmed &&
                            !workspace.payroll_entries.some(
                              (p) => p.shift_id === s.id,
                            ) && (
                              <Button
                                variant="ghost"
                                disabled={busy}
                                onClick={() => {
                                  if (
                                    confirm(
                                      "Cancel this unconfirmed shift? Its audit history will be retained.",
                                    )
                                  )
                                    void run(() =>
                                      mutate("/shifts/cancel", {
                                        organization_id: org!.id,
                                        shift_id: s.id,
                                        note: "Administrator cancelled this unconfirmed shift.",
                                      }),
                                    );
                                }}
                              >
                                Cancel shift
                              </Button>
                            )}
                          {!s.confirmed && !admin && (
                            <Button
                              disabled={busy}
                              onClick={() =>
                                void run(() =>
                                  mutate("/shifts/confirm", { shift_id: s.id }),
                                )
                              }
                            >
                              {t.confirm}
                            </Button>
                          )}
                          {admin &&
                            !s.confirmed &&
                            !workspace.payroll_entries.some(
                              (p) => p.shift_id === s.id,
                            ) && (
                              <Button
                                variant="outline"
                                onClick={() =>
                                  setModal({ type: "shift", id: s.id })
                                }
                              >
                                {t.whatif}
                              </Button>
                            )}
                          {admin &&
                            !workspace.payroll_entries.some(
                              (p) => p.shift_id === s.id,
                            ) && (
                              <Button
                                variant="outline"
                                onClick={() => void recordPayroll(s)}
                              >
                                {t.payroll}
                              </Button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {!workspace?.shifts.length && <Empty>{t.noShifts}</Empty>}
        </section>
      </>
    );
  }
  const [payrollShift, setPayrollShift] = useState<WorkShift | null>(null);
  async function recordPayroll(s: WorkShift) {
    setPayrollShift(s);
  }
  function CasesPage() {
    const filter = caseFilter,
      setFilter = setCaseFilter;
    const cases =
      workspace?.pay_disputes.filter(
        (d) => filter === "all" || d.status === filter,
      ) || [];
    return (
      <>
        <PageTitle title={admin ? t.disputes : t.cases} subtitle={t.proofSub} />
        <div className="filter-row">
          {["all", "requested", "responded", "closed"].map((f) => (
            <button
              key={f}
              className={filter === f ? "active" : ""}
              onClick={() => setFilter(f)}
            >
              {f === "all"
                ? t.viewAll
                : t[f as "requested" | "responded" | "closed"]}
            </button>
          ))}
        </div>
        {!cases.length ? (
          <section className="card">
            <Empty>{t.noCases}</Empty>
          </section>
        ) : (
          <div className="case-list">
            {cases.map((d) => {
              const s = workspace!.shifts.find((s) => s.id === d.shift_id),
                p = workspace!.pay.find((p) => p.shiftId === d.shift_id);
              return (
                <article className="card case-card" key={d.id}>
                  <div className="section-head">
                    <div>
                      <div className="eyebrow">
                        PAY REVIEW · {d.id.slice(0, 8)}
                      </div>
                      <h3>{s?.location}</h3>
                    </div>
                    <Badge
                      tone={
                        d.status === "closed"
                          ? "green"
                          : d.status === "responded"
                            ? "blue"
                            : "amber"
                      }
                    >
                      {t[d.status]}
                    </Badge>
                  </div>
                  <p>{d.reason}</p>
                  <div className="case-meta">
                    <span>
                      {s && fmt(s.starts_at)} · {p && money(p.expectedPaise)}{" "}
                      {t.expected.toLowerCase()}
                    </span>
                    <span>{fmt(d.created_at)}</span>
                  </div>
                  <div className="button-row">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setModal({ type: "replay", id: d.shift_id })
                      }
                    >
                      <Play size={14} />
                      {t.replay}
                    </Button>
                    {admin && d.status === "requested" && (
                      <Button
                        onClick={() => setModal({ type: "resolve", id: d.id })}
                      >
                        {t.resolve}
                        <ArrowUpRight size={15} />
                      </Button>
                    )}
                    {!admin && d.status === "responded" && (
                      <Button
                        variant="outline"
                        onClick={() => setModal({ type: "clarify", id: d.id })}
                      >
                        {language === "ta"
                          ? "மேலும் விளக்கம் கேளுங்கள்"
                          : language === "hi"
                            ? "स्पष्टीकरण माँगें"
                            : "Request clarification"}
                      </Button>
                    )}
                    {!admin && d.status === "responded" && (
                      <Button
                        disabled={busy}
                        onClick={() =>
                          void run(() =>
                            mutate("/reviews/confirm", { dispute_id: d.id }),
                          )
                        }
                      >
                        <CheckCheck size={16} />
                        {t.confirmResolution}
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <div className="info-strip">
          <Fingerprint size={20} />
          {t.resetInfo}
        </div>
      </>
    );
  }
  function SafetyPage() {
    const tab = safetyTab,
      setTab = setSafetyTab,
      orgs = demoOrgs;
    async function submit(e: FormEvent<HTMLFormElement>) {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      await run(async () => {
        const result = await api<NonNullable<typeof credentials>>("/safety", {
          organization_id: f.get("organization_id"),
          category: f.get("category"),
          priority: f.get("priority"),
          description: f.get("description"),
        });
        setCredentials(result);
        setTracking(null);
      }, t.reportSaved);
    }
    async function track(e: FormEvent<HTMLFormElement>) {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      await run(
        async () =>
          setTracking(
            await api<Tracking>("/safety/track", {
              reference: String(f.get("reference")).trim(),
              token: String(f.get("token")).trim(),
            }),
          ),
        t.track,
      );
    }
    return (
      <>
        <PageTitle title={t.concern} subtitle={t.concernSub} />
        <div className="safety-layout">
          <section className="card">
            <div className="tabs">
              <button
                className={tab === "submit" ? "active" : ""}
                onClick={() => setTab("submit")}
              >
                <ShieldAlert size={17} />
                {t.report}
              </button>
              <button
                className={tab === "track" ? "active" : ""}
                onClick={() => setTab("track")}
              >
                <Fingerprint size={17} />
                {t.track}
              </button>
            </div>
            {tab === "submit" ? (
              credentials ? (
                <div className="credential-receipt">
                  <span className="receipt-check">
                    <CheckCheck size={28} />
                  </span>
                  <h2>{t.reportSaved}</h2>
                  <p>{t.saveCredentials}</p>
                  <dl>
                    <dt>{t.reference}</dt>
                    <dd>{credentials.reference}</dd>
                    <dt>{t.secret}</dt>
                    <dd className="secret-token">{credentials.token}</dd>
                  </dl>
                  <div className="button-row">
                    <Button
                      onClick={() =>
                        void run(async () => {
                          await navigator.clipboard.writeText(
                            `${credentials.reference}\n${credentials.token}`,
                          );
                        }, t.copied)
                      }
                    >
                      {t.copy}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTab("track");
                      }}
                    >
                      {t.track}
                      <ArrowRight size={15} />
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={(e) => void submit(e)} className="form-stack">
                  <Field label={t.settings}>
                    <select
                      name="organization_id"
                      defaultValue={org?.id}
                      required
                    >
                      {org ? (
                        <option value={org.id}>{org.name}</option>
                      ) : (
                        <option value="">Choose organization</option>
                      )}
                      {orgs
                        .filter((o) => o.id !== org?.id)
                        .map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                    </select>
                  </Field>
                  <div className="form-grid">
                    <Field label={t.category}>
                      <select name="category" required>
                        {(org?.sector_id === "healthcare"
                          ? ["sanitation", "equipment", "workload", "other"]
                          : [
                              "equipment",
                              "fall_hazard",
                              "sanitation",
                              "workload",
                              "other",
                            ]
                        ).map((c) => (
                          <option value={c} key={c}>
                            {categoryLabel(c)}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label={t.priority}>
                      <select name="priority">
                        <option value="normal">
                          {language === "ta"
                            ? "வழக்கமான"
                            : language === "hi"
                              ? "सामान्य"
                              : "Normal"}
                        </option>
                        <option value="high">
                          {language === "ta"
                            ? "உயர்"
                            : language === "hi"
                              ? "उच्च"
                              : "High"}
                        </option>
                      </select>
                    </Field>
                  </div>
                  <Field label={t.description} hint="20–4,000 characters">
                    <textarea
                      name="description"
                      required
                      minLength={20}
                      maxLength={4000}
                      rows={5}
                      placeholder={
                        language === "en"
                          ? "Describe the concern and where action is needed. Avoid identifying yourself."
                          : t.description
                      }
                    />
                  </Field>
                  <p className="caption">
                    <LockKeyhole size={14} />
                    {t.privacy}
                  </p>
                  <Button disabled={busy} type="submit">
                    <ShieldCheck size={17} />
                    {t.submit}
                    <ArrowUpRight size={15} />
                  </Button>
                </form>
              )
            ) : (
              <>
                <form className="form-stack" onSubmit={(e) => void track(e)}>
                  <Field label={t.reference}>
                    <input
                      name="reference"
                      defaultValue={credentials?.reference}
                      placeholder="FS-0123456789ABCDEF"
                      required
                      pattern="FS-[A-F0-9]{16}"
                      autoComplete="off"
                    />
                  </Field>
                  <Field label={t.secret}>
                    <input
                      name="token"
                      defaultValue={credentials?.token}
                      type="password"
                      required
                      pattern="[a-f0-9]{64}"
                      autoComplete="off"
                    />
                  </Field>
                  <Button type="submit" disabled={busy}>
                    {t.check}
                    <ArrowRight size={15} />
                  </Button>
                </form>
                {tracking && (
                  <div className="tracked-case">
                    <div className="section-head">
                      <h3>{tracking.reference}</h3>
                      <Badge tone="blue">{statusLabel(tracking.status)}</Badge>
                    </div>
                    <SafetyTimeline events={tracking.events} />
                  </div>
                )}
              </>
            )}
          </section>
          <aside>
            <div className="privacy-card">
              <div className="privacy-visual">
                <LockKeyhole size={42} />
                <span />
                <span />
              </div>
              <Badge tone="green">
                <Fingerprint size={13} />
                {t.anonymous}
              </Badge>
              <h2>{t.featureTwo}</h2>
              <p>{t.privacy}</p>
              <hr />
              <p>{t.safetyNote}</p>
            </div>
            <div className="info-strip">
              <CircleHelp size={20} />
              {t.saveCredentials}
            </div>
          </aside>
        </div>
      </>
    );
  }
  function categoryLabel(c: string) {
    const labels: Record<string, string[]> = {
      equipment: ["Equipment", "உபகரணங்கள்", "उपकरण"],
      fall_hazard: ["Fall hazard", "விழும் ஆபத்து", "गिरने का खतरा"],
      sanitation: ["Sanitation", "சுகாதாரம்", "स्वच्छता"],
      workload: ["Workload", "பணிச்சுமை", "काम का बोझ"],
      other: ["Other", "மற்றவை", "अन्य"],
    };
    return (
      labels[c]?.[language === "en" ? 0 : language === "ta" ? 1 : 2] || human(c)
    );
  }
  function statusLabel(s: string) {
    const labels: Record<string, string[]> = {
      submitted: ["Submitted", "பதிவானது", "दर्ज हुआ"],
      acknowledged: ["Acknowledged", "ஏற்றுக்கொள்ளப்பட்டது", "स्वीकार किया"],
      under_review: ["Under review", "ஆய்வில்", "समीक्षा जारी"],
      action_assigned: [
        "Action assigned",
        "நடவடிக்கை ஒதுக்கப்பட்டது",
        "कार्रवाई सौंपी गई",
      ],
      mitigated: [
        "Mitigation documented",
        "தடுப்பு நடவடிக்கை பதிவானது",
        "निवारण दर्ज",
      ],
      closed: [t.closed, t.closed, t.closed],
    };
    return (
      labels[s]?.[language === "en" ? 0 : language === "ta" ? 1 : 2] || human(s)
    );
  }
  function SafetyTimeline({ events }: { events: SafetyEvent[] }) {
    return (
      <ol className="timeline compact">
        {events.map((e, i) => (
          <li key={e.id || i}>
            <span className="timeline-dot">
              <Check size={12} />
            </span>
            <div>
              <div className="timeline-head">
                <strong>{statusLabel(e.status)}</strong>
                <time>{fmt(e.created_at)}</time>
              </div>
              <p>{e.note}</p>
            </div>
          </li>
        ))}
      </ol>
    );
  }
  function AdminSafety() {
    const filter = safetyFilter,
      setFilter = setSafetyFilter;
    const reports =
      workspace?.safety_reports.filter(
        (s) => filter === "all" || s.status !== "closed",
      ) || [];
    return (
      <>
        <PageTitle title={t.safety} subtitle={t.concernSub} />
        <div className="filter-row">
          {["open", "all"].map((f) => (
            <button
              className={filter === f ? "active" : ""}
              onClick={() => setFilter(f)}
              key={f}
            >
              {f === "all" ? t.viewAll : t.openSafety}
            </button>
          ))}
        </div>
        <div className="case-list">
          {reports.map((r) => (
            <article className="card case-card" key={r.id}>
              <div className="section-head">
                <div>
                  <span className="eyebrow">
                    {r.reference} · {t.anonymous}
                  </span>
                  <h3>{categoryLabel(r.category)}</h3>
                </div>
                <Badge tone={r.priority === "high" ? "red" : "blue"}>
                  {human(r.priority)} · {statusLabel(r.status)}
                </Badge>
              </div>
              <p>{r.description}</p>
              <SafetyTimeline
                events={workspace!.safety_case_events
                  .filter((e) => e.report_id === r.id)
                  .sort(
                    (a, b) =>
                      Date.parse(a.created_at) - Date.parse(b.created_at),
                  )}
              />
              {r.status !== "closed" && (
                <Button onClick={() => setModal({ type: "safety", id: r.id })}>
                  {t.acknowledge}
                  <ArrowUpRight size={15} />
                </Button>
              )}
            </article>
          ))}
        </div>
        {!reports.length && (
          <section className="card">
            <Empty>{t.noSafety}</Empty>
          </section>
        )}
      </>
    );
  }
  function RestPage() {
    const shifts = workspace?.shifts || [];
    const policy = workspace!.pay_policies[0];
    const copy = assistanceCopy[language];
    const ordered = [...shifts].sort(
      (a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at),
    );
    const next =
      shifts.find((s) => s.id === restShiftId) ||
      ordered.find(
        (s) => !s.confirmed && Date.parse(s.starts_at) >= Date.now(),
      ) ||
      ordered.find((s) => !s.confirmed) ||
      ordered.at(-1);
    const grouped = new Map<string, Workspace["risks"]>();
    for (const risk of workspace!.risks) {
      const worker = shifts.find((s) => s.id === risk.shiftId)?.worker_id || "";
      const key = `${worker}:${risk.type}`;
      grouped.set(key, [...(grouped.get(key) || []), risk]);
    }
    return (
      <>
        <PageTitle title={t.restTitle} subtitle={t.restSub} />
        <div className="stats-grid three">
          <Metric
            title={t.risks}
            value={workspace!.risks.length}
            icon={<Activity size={18} />}
            tone="amber"
          />
          <Metric
            title={t.minimum}
            value={`${policy.min_rest_minutes / 60}h`}
            icon={<Clock3 size={18} />}
            note={t.orgPolicy}
          />
          <Metric
            title={t.shifts}
            value={shifts.length}
            icon={<CalendarDays size={18} />}
            note={org?.name}
          />
        </div>
        <div className="dashboard-columns">
          <section className="card">
            <div className="section-head">
              <h2>{t.risks}</h2>
              <Badge tone={workspace!.risks.length ? "amber" : "green"}>
                {workspace!.risks.length}
              </Badge>
            </div>
            {[...grouped.entries()].map(([key, warnings]) => (
              <div className="risk-item" key={key}>
                <span className="warning-symbol">
                  <ShieldAlert size={22} />
                </span>
                <div>
                  <h3>
                    {riskLabels[language][
                      warnings[0].type as keyof typeof riskLabels.en
                    ] || human(warnings[0].type)}
                  </h3>
                  <p>
                    {new Set(warnings.map((r) => r.shiftId)).size}{" "}
                    {copy.affected}
                  </p>
                  <details>
                    <summary>{copy.details}</summary>
                    {warnings.map((r) => {
                      const shift = shifts.find((s) => s.id === r.shiftId);
                      return (
                        <p key={`${r.type}:${r.shiftId}`}>
                          <strong>
                            {shift
                              ? `${fmt(shift.starts_at)} — ${time(shift.ends_at)}`
                              : t.shifts}
                          </strong>
                          <br />
                          {r.minutes !== undefined && r.type === "overlap"
                            ? `${r.minutes / 60}h ${riskLabels[language].overlap.toLowerCase()}`
                            : r.minutes !== undefined && r.type === "short_rest"
                              ? `${r.minutes / 60}h ${t.restWindow.toLowerCase()} / ${r.requiredMinutes! / 60}h ${t.minimum.toLowerCase()}`
                              : r.detail}
                        </p>
                      );
                    })}
                  </details>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMobile(false);
                      navigate("/app/shifts");
                    }}
                  >
                    {copy.review}
                  </Button>
                </div>
              </div>
            ))}
            {!workspace!.risks.length && <Empty>{t.clear}</Empty>}
            <p className="caption">
              {t.policyNote}{" "}
              {language === "en"
                ? "Scheduling signals are not medical diagnoses."
                : ""}
            </p>
          </section>
          {next && (
            <div>
              <Field label={copy.choose}>
                <select
                  aria-label={copy.choose}
                  value={next.id}
                  onChange={(event) => {
                    setRestShiftId(event.target.value);
                    setWhatif(null);
                  }}
                >
                  {ordered.map((s) => (
                    <option key={s.id} value={s.id}>
                      {fmt(s.starts_at)} — {time(s.ends_at)}
                    </option>
                  ))}
                </select>
              </Field>
              {WhatIf({
                shift: next,
                policy,
                editable:
                  !!admin &&
                  !next.confirmed &&
                  !workspace!.payroll_entries.some(
                    (p) => p.shift_id === next.id,
                  ),
              })}
            </div>
          )}
        </div>
      </>
    );
  }
  function WhatIf({
    shift,
    policy,
    editable,
  }: {
    shift: WorkShift;
    policy: Policy;
    editable: boolean;
  }) {
    const hour =
      whatif?.id === shift.id
        ? whatif.hour
        : Number(
            new Intl.DateTimeFormat("en-GB", {
              timeZone: policy.timezone,
              hour: "2-digit",
              hourCycle: "h23",
            }).format(new Date(shift.starts_at)),
          );
    const setHour = (hour: number) => setWhatif({ id: shift.id, hour });
    const original = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: policy.timezone,
        hour: "2-digit",
        hourCycle: "h23",
      }).format(new Date(shift.starts_at)),
    );
    let start = shift.starts_at,
      end = shift.ends_at,
      previewError = "";
    try {
      const wall = new Intl.DateTimeFormat("sv-SE", {
        timeZone: policy.timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
        .format(new Date(shift.starts_at))
        .replace(" ", "T");
      start = zonedDateTimeToIso(
        wall.slice(0, 11) + String(hour).padStart(2, "0") + wall.slice(13),
        policy.timezone,
      );
      end = new Date(
        Date.parse(start) +
          Date.parse(shift.ends_at) -
          Date.parse(shift.starts_at),
      ).toISOString();
    } catch (e) {
      previewError = (e as Error).message;
    }
    const others = workspace!.shifts.filter(
      (s) => s.id !== shift.id && s.worker_id === shift.worker_id,
    );
    const conflict = others.find(
      (s) =>
        Date.parse(s.starts_at) < Date.parse(end) &&
        Date.parse(start) < Date.parse(s.ends_at),
    );
    const prior =
      conflict ||
      others
        .filter((s) => Date.parse(s.ends_at) <= Date.parse(start))
        .sort((a, b) => Date.parse(b.ends_at) - Date.parse(a.ends_at))[0];
    const rest = prior
      ? restWindow(prior.ends_at, start, policy.min_rest_minutes)
      : null;
    return (
      <section className="card whatif-card">
        <div className="eyebrow teal">
          <Settings2 size={16} /> PREVENTION, NOT JUST DETECTION
        </div>
        <h2>{t.whatif}</h2>
        <p>
          {fmt(shift.starts_at)} — {time(shift.ends_at)}
        </p>
        {prior && (
          <div className="schedule-window">
            <div>
              <small>{t.end}</small>
              <strong>{time(prior.ends_at)}</strong>
              <span>
                {fmt(prior.ends_at, { day: "numeric", month: "short" })}
              </span>
            </div>
            <ArrowRight size={20} />
            <div>
              <small>{t.start}</small>
              <strong>{time(start)}</strong>
              <span>{fmt(start, { day: "numeric", month: "short" })}</span>
            </div>
          </div>
        )}
        <Field label={`${t.start}: ${time(start)}`}>
          <input
            aria-label={t.whatif}
            type="range"
            min={0}
            max={23}
            step={1}
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
          />
        </Field>
        <div className="range-labels">
          <span>00:00</span>
          <span>12:00</span>
          <span>23:00</span>
        </div>
        {previewError && <p role="alert">{previewError}</p>}
        {rest && !previewError && (
          <div
            className={`rest-result ${rest.warning ? "rest-warning" : "rest-clear"}`}
          >
            <span>
              {rest.warning ? (
                <ShieldAlert size={23} />
              ) : (
                <CheckCheck size={23} />
              )}
            </span>
            <div>
              <b>
                {conflict
                  ? assistanceCopy[language].overlap
                  : rest.warning
                    ? t.warning
                    : t.clear}
              </b>
              {conflict ? (
                <p>
                  {(Math.min(Date.parse(conflict.ends_at), Date.parse(end)) -
                    Math.max(
                      Date.parse(conflict.starts_at),
                      Date.parse(start),
                    )) /
                    3600000}{" "}
                  {assistanceCopy[language].overlaps}
                </p>
              ) : (
                <p>
                  {rest.minutes / 60}h {t.restWindow.toLowerCase()} /{" "}
                  {rest.requiredMinutes / 60}h {t.minimum.toLowerCase()}
                </p>
              )}
            </div>
          </div>
        )}
        <p className="caption">
          {t.end}: {fmt(end)} · {t.timezone}: {policy.timezone}
        </p>
        {editable && (
          <Button
            disabled={busy || hour === original || !!previewError}
            onClick={() =>
              void run(
                () =>
                  mutate("/shifts", {
                    id: shift.id,
                    organization_id: shift.organization_id,
                    worker_id: shift.worker_id,
                    starts_at: start,
                    ends_at: end,
                    break_minutes: shift.break_minutes,
                    location: shift.location,
                  }),
                t.scheduleSaved,
              )
            }
          >
            {t.saveSchedule}
            <Check size={16} />
          </Button>
        )}
        {!editable && <p className="caption">{t.shiftPolicy}</p>}
      </section>
    );
  }
  function Workforce() {
    return (
      <>
        <PageTitle title={t.workforce} subtitle={org?.name} />
        <section className="card table-card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t.workerName}</th>
                  <th>{t.role}</th>
                  <th>{t.shifts}</th>
                  <th>{t.openReviews}</th>
                </tr>
              </thead>
              <tbody>
                {workspace?.organization_members.map((m) => (
                  <tr key={m.user_id}>
                    <td>
                      <span className="person">
                        <span className="avatar">
                          {m.display_name
                            .split(" ")
                            .map((x) => x[0])
                            .join("")
                            .slice(0, 2)}
                        </span>
                        <b>{m.display_name}</b>
                      </span>
                    </td>
                    <td>
                      <Badge>{m.role === "admin" ? t.admin : t.worker}</Badge>
                    </td>
                    <td>
                      {
                        workspace.shifts.filter(
                          (s) => s.worker_id === m.user_id,
                        ).length
                      }
                    </td>
                    <td>
                      {
                        workspace.pay_disputes.filter(
                          (d) =>
                            d.worker_id === m.user_id && d.status !== "closed",
                        ).length
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </>
    );
  }
  function Insights() {
    const w = workspace!;
    const closed = w.pay_disputes.filter((d) => d.resolved_at);
    const hours = closed.length
      ? closed.reduce(
          (n, d) =>
            n +
            (Date.parse(d.resolved_at!) - Date.parse(d.created_at)) / 3600000,
          0,
        ) / closed.length
      : null;
    const max = Math.max(
      1,
      ...w.pay.filter((p) => p.hasPayroll).map((p) => p.expectedPaise),
    );
    return (
      <>
        {config?.saasEnabled && !org?.is_demo && (
          <Button
            disabled={
              busy ||
              workspace!.business_events?.some(
                (e) => e.event_type === "workforce_dashboard_reviewed",
              )
            }
            onClick={() =>
              void run(
                () =>
                  mutate("/businesses/review", { organization_id: org!.id }),
                "Dashboard review recorded.",
              )
            }
          >
            {workspace!.business_events?.some(
              (e) => e.event_type === "workforce_dashboard_reviewed",
            )
              ? "Dashboard review recorded"
              : "Mark workforce dashboard reviewed"}
          </Button>
        )}
        <PageTitle title={t.analytics} subtitle={t.insight} />
        <div className="stats-grid three">
          <Metric
            title={t.completed}
            value={w.shifts.filter((s) => s.confirmed).length}
            icon={<CheckCheck size={20} />}
            note={t.verified}
          />
          <Metric
            title={t.resolutionTime}
            value={hours === null ? "—" : `${hours.toFixed(1)}h`}
            icon={<Clock3 size={20} />}
            note={`${closed.length} ${t.closed.toLowerCase()}`}
          />
          <Metric
            title={t.openSafety}
            value={w.safety_reports.filter((s) => s.status !== "closed").length}
            icon={<ShieldCheck size={20} />}
            note={t.featureTwo}
          />
        </div>
        <section className="card chart-card">
          <div className="section-head">
            <h2>{t.earnings}</h2>
            <div className="chart-legend">
              <span>
                <i />
                {t.expected}
              </span>
              <span>
                <i />
                {t.recorded}
              </span>
            </div>
          </div>
          {w.pay
            .filter((p) => p.hasPayroll)
            .map((p) => (
              <div className="bar-row" key={p.shiftId}>
                <span>
                  {fmt(w.shifts.find((s) => s.id === p.shiftId)!.starts_at, {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <div>
                  <div
                    className="bar expected"
                    style={{ width: `${(p.expectedPaise / max) * 100}%` }}
                  >
                    <span>{money(p.expectedPaise)}</span>
                  </div>
                  <div
                    className="bar recorded"
                    style={{ width: `${(p.recordedPaise / max) * 100}%` }}
                  >
                    <span>{money(p.recordedPaise)}</span>
                  </div>
                </div>
              </div>
            ))}
        </section>
      </>
    );
  }
  function Profile() {
    return (
      <>
        <PageTitle
          title={admin ? t.settings : t.profile}
          subtitle={org?.name}
        />
        <div className="dashboard-columns">
          <section className="card profile-card">
            <span className="avatar large">
              {workspace!.member.display_name
                .split(" ")
                .map((s) => s[0])
                .join("")}
            </span>
            <h2>{workspace!.member.display_name}</h2>
            <Badge tone="green">{admin ? t.admin : t.worker}</Badge>
            <dl className="profile-details">
              <dt>{t.settings}</dt>
              <dd>{org?.name}</dd>
              <dt>Industry</dt>
              <dd>
                {org?.sector_id === "construction"
                  ? t.construction
                  : org?.sector_id === "healthcare"
                    ? t.healthcare
                    : "General workplace"}
              </dd>
              <dt>{t.timezone}</dt>
              <dd>{workspace!.pay_policies[0].timezone}</dd>
              <dt>{t.language}</dt>
              <dd>
                <LanguageSelect />
              </dd>
            </dl>
            <Button
              variant="outline"
              onClick={() => {
                sessionStorage.removeItem("nyaveris-invitation");
                void client?.auth.signOut();
              }}
            >
              <LogOut size={16} />
              {t.logout}
            </Button>
          </section>
          <section className="card">
            <div className="eyebrow teal">
              <ShieldCheck size={16} />
              {t.orgPolicy}
            </div>
            <h2>{t.featureOne}</h2>
            <dl className="profile-details">
              <dt>Pay basis</dt>
              <dd>{workspace!.pay_policies[0].basis || "hourly"}</dd>
              <dt>Daily rate</dt>
              <dd>{money(workspace!.pay_policies[0].daily_paise || 80000)}</dd>
              <dt>Hourly rate</dt>
              <dd>{money(workspace!.pay_policies[0].hourly_paise)}</dd>
              <dt>Regular threshold</dt>
              <dd>{workspace!.pay_policies[0].regular_minutes / 60}h</dd>
              <dt>Overtime multiplier</dt>
              <dd>{workspace!.pay_policies[0].overtime_bps / 10000}×</dd>
              <dt>{t.minimum}</dt>
              <dd>{workspace!.pay_policies[0].min_rest_minutes / 60}h</dd>
            </dl>
            <div className="info-strip">
              <LockKeyhole size={19} />
              {language === "ta"
                ? "பழைய பணிகளின் கொள்கை நகல் பாதுகாக்கப்படுகிறது."
                : language === "hi"
                  ? "पुराने काम की नीति का स्नैपशॉट सुरक्षित रहता है।"
                  : "Verified work retains its original policy snapshot."}
            </div>
            <p className="caption">{t.policyNote}</p>
            {admin && (
              <PolicyEditor
                policy={workspace!.pay_policies[0]}
                language={language}
                busy={busy}
                onSave={(policy, note) =>
                  void run(() =>
                    mutate("/policies", {
                      ...policyInput.parse(policy),
                      organization_id: org!.id,
                      note,
                    }),
                  )
                }
              />
            )}
          </section>
        </div>
      </>
    );
  }
  function Replay() {
    if (!selectedShift || !workspace) return null;
    const events = workspace.dispute_events
      .filter((e) => e.shift_id === selectedShift.id)
      .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
    return (
      <div className="replay">
        <div className="replay-banner">
          <Fingerprint size={27} />
          <div>
            <span className="eyebrow">PROOFLOOP</span>
            <h3>{selectedShift.location}</h3>
            <p>
              {fmt(selectedShift.starts_at)} → {time(selectedShift.ends_at)}
            </p>
          </div>
        </div>
        {selectedPay && (
          <div className="replay-numbers">
            <span>
              {t.expected}
              <b>{money(selectedPay.expectedPaise)}</b>
            </span>
            <span>
              {t.recorded}
              <b>
                {selectedPay.hasPayroll
                  ? money(selectedPay.recordedPaise)
                  : "—"}
              </b>
            </span>
            <span>
              {t.difference}
              <b>
                {selectedPay.hasPayroll
                  ? money(selectedPay.discrepancyPaise)
                  : "—"}
              </b>
            </span>
          </div>
        )}
        <ol className="timeline">
          {events.map((e, i) => (
            <li key={e.id}>
              <span className="timeline-dot">{i + 1}</span>
              <div>
                <div className="timeline-head">
                  <strong>{human(e.event_type)}</strong>
                  <Badge tone={e.actor_role === "worker" ? "green" : "blue"}>
                    {e.actor_role === "worker"
                      ? t.worker
                      : e.actor_role === "system"
                        ? "FairPay engine"
                        : t.admin}
                  </Badge>
                </div>
                <time>{fmt(e.created_at)}</time>
                <p>{e.explanation}</p>
                {Object.keys(e.details).length > 0 && (
                  <dl className="event-details">
                    {Object.entries(e.details)
                      .filter(([, v]) => v !== null)
                      .map(([k, v]) => (
                        <div key={k}>
                          <dt>{human(k)}</dt>
                          <dd>
                            {k.includes("paise")
                              ? money(Number(v))
                              : k.includes("start") || k.includes("end")
                                ? fmt(String(v))
                                : String(v)}
                          </dd>
                        </div>
                      ))}
                  </dl>
                )}
              </div>
            </li>
          ))}
        </ol>
        {selectedPay?.hasPayroll && selectedPay.discrepancyPaise !== 0 && (
          <div className="discrepancy-callout">
            <CircleHelp size={22} />
            <div>
              <b>
                {money(selectedPay.discrepancyPaise)} · {t.difference}
              </b>
              <p>{t.potential}</p>
            </div>
          </div>
        )}
        <p className="caption">
          Application roles cannot edit or delete these events. This is an
          accountable history, not a claim that records are tamper-proof or
          proof of the underlying work.
        </p>
      </div>
    );
  }
  function ReviewForm() {
    return (
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void run(() =>
            mutate(
              modal?.type === "clarify" ? "/reviews/reopen" : "/reviews",
              modal?.type === "clarify"
                ? {
                    dispute_id: modal.id,
                    reason: f.get("reason"),
                  }
                : { shift_id: modal?.id, reason: f.get("reason") },
            ),
          );
        }}
      >
        <div className="info-strip">
          <Wallet size={20} />
          {t.expected}: {money(selectedPay?.expectedPaise || 0)} · {t.recorded}:{" "}
          {money(selectedPay?.recordedPaise || 0)}
        </div>
        <Field label={t.reason}>
          <textarea
            name="reason"
            minLength={10}
            maxLength={1000}
            required
            rows={4}
            defaultValue={
              language === "ta"
                ? "எனது உறுதிப்படுத்திய வேலை நேரத்தின் கூடுதல் நேர ஊதியத்தை மறுஆய்வு செய்யவும்."
                : language === "hi"
                  ? "कृपया मेरी पुष्टि की गई शिफ्ट के अतिरिक्त समय के वेतन की समीक्षा करें।"
                  : "Please review the overtime earnings for my confirmed working hours."
            }
          />
        </Field>
        <Button type="submit" disabled={busy}>
          {t.request}
          <ArrowRight size={16} />
        </Button>
      </form>
    );
  }
  function ResolveForm() {
    const p = workspace?.pay.find(
      (p) => p.shiftId === selectedDispute?.shift_id,
    );
    return (
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void run(() =>
            mutate("/reviews/resolve", {
              dispute_id: modal?.id,
              corrected_paise: Math.round(Number(f.get("amount")) * 100),
              explanation: f.get("note"),
            }),
          );
        }}
      >
        <div className="info-strip">
          <CircleHelp size={20} />
          {selectedDispute?.reason}
        </div>
        <Field label={t.amount}>
          <input
            name="amount"
            type="number"
            min="0"
            max="1000000"
            step="0.01"
            required
            defaultValue={(p?.expectedPaise || 0) / 100}
          />
        </Field>
        <Field label={t.note}>
          <textarea
            name="note"
            rows={4}
            minLength={10}
            maxLength={2000}
            required
            placeholder="Explain the correction or why the recorded amount is appropriate."
          />
        </Field>
        <p className="caption">
          The worker will review this response before the case can close.
        </p>
        <Button type="submit" disabled={busy}>
          {t.save}
          <Check size={16} />
        </Button>
      </form>
    );
  }
  function SafetyUpdate() {
    const index = safetyStates.indexOf(selectedSafety?.status || "submitted");
    return (
      <>
        <p>{selectedSafety?.description}</p>
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void run(() =>
              mutate("/safety/update", {
                report_id: modal?.id,
                status: f.get("status"),
                note: f.get("note"),
              }),
            );
          }}
        >
          <Field label={t.nextStatus}>
            <select name="status">
              <option value={safetyStates[index + 1]}>
                {statusLabel(safetyStates[index + 1] || "closed")}
              </option>
            </select>
          </Field>
          <Field label={t.note}>
            <textarea
              name="note"
              required
              minLength={10}
              maxLength={2000}
              rows={4}
            />
          </Field>
          <Button disabled={busy} type="submit">
            {t.save}
            <Check size={16} />
          </Button>
        </form>
      </>
    );
  }
  function ShiftForm() {
    const s = selectedShift;
    const local = (v?: string) =>
      v
        ? new Intl.DateTimeFormat("sv-SE", {
            timeZone: workspace!.pay_policies[0].timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
          })
            .format(new Date(v))
            .replace(" ", "T")
        : "";
    return (
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void run(
            () =>
              mutate("/shifts", {
                id: s?.id || null,
                organization_id: org!.id,
                worker_id: f.get("worker_id"),
                starts_at: zonedDateTimeToIso(
                  String(f.get("starts_at")),
                  workspace!.pay_policies[0].timezone,
                ),
                ends_at: zonedDateTimeToIso(
                  String(f.get("ends_at")),
                  workspace!.pay_policies[0].timezone,
                ),
                break_minutes: Number(f.get("break_minutes")),
                location: f.get("location"),
              }),
            t.scheduleSaved,
          );
        }}
      >
        <p className="caption">
          Times use {workspace!.pay_policies[0].timezone}. For overnight shifts,
          select the next day's end date.
        </p>
        <Field label={t.workerName}>
          <select name="worker_id" required defaultValue={s?.worker_id}>
            {workspace!.organization_members
              .filter((m) => m.role === "worker" && m.active !== false)
              .map((m) => (
                <option value={m.user_id} key={m.user_id}>
                  {m.display_name}
                </option>
              ))}
          </select>
        </Field>
        <div className="form-grid">
          <Field label={t.start}>
            <input
              name="starts_at"
              type="datetime-local"
              required
              defaultValue={local(s?.starts_at)}
            />
          </Field>
          <Field label={t.end}>
            <input
              name="ends_at"
              type="datetime-local"
              required
              defaultValue={local(s?.ends_at)}
            />
          </Field>
        </div>
        <Field label={`${t.break} (min)`}>
          <input
            name="break_minutes"
            type="number"
            min="0"
            max="1440"
            required
            defaultValue={s?.break_minutes ?? 30}
          />
        </Field>
        <Field label={t.location}>
          <input
            name="location"
            required
            minLength={2}
            maxLength={100}
            defaultValue={s?.location || ""}
          />
        </Field>
        <Button disabled={busy} type="submit">
          {t.save}
          <Check size={16} />
        </Button>
      </form>
    );
  }
  async function openBusiness(orgId: string, message: string) {
    setNeedsOnboarding(false);
    setSelectedOrg(orgId);
    setToast(message);
    navigate("/app/home");
  }
  function Login() {
    return (
      <AuthExperience
        client={client}
        session={session}
        googleEnabled={!!config?.googleEnabled}
        demo={
          config?.demoEnabled ? (
            <div className="demo-login">
              <Button
                variant="outline"
                disabled={busy || !client}
                onClick={() => void demo("worker")}
              >
                {t.getStarted}
              </Button>
              <Button
                variant="outline"
                disabled={busy || !client}
                onClick={() => void demo("admin")}
              >
                {t.employerDemo}
              </Button>
            </div>
          ) : undefined
        }
      />
    );
  }
  function Landing() {
    return (
      <div className="landing">
        <nav className="landing-nav">
          <Brand />
          <div className="landing-links">
            <a href="#engine">The fairness engine</a>
            <a href="#industries">Built for people</a>
          </div>
          <div className="button-row">
            <LanguageSelect />
            <Link className="button" to="/signup">
              Create Account
            </Link>
            <Link className="button button-outline" to="/login">
              {t.signIn}
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </nav>
        <main>
          <section className="hero">
            <div className="hero-copy">
              <Badge tone="green">
                <span className="status-dot" /> DECENT WORK. BY DESIGN.
              </Badge>
              <h1>
                Fair work.
                <br />
                Clear records.
                <br />
                <span>A stronger voice.</span>
              </h1>
              <p className="brand-tagline">
                Fairness You Can Trace. Trust You Can Prove.
              </p>
              <p>{t.landingSub}</p>
              <div className="button-row">
                <Button
                  disabled={busy || !config?.demoEnabled}
                  onClick={() => void demo("worker")}
                >
                  {t.getStarted}
                  <ArrowUpRight size={17} />
                </Button>
                <Button
                  variant="outline"
                  disabled={busy || !config?.demoEnabled}
                  onClick={() => void demo("admin")}
                >
                  {t.employerDemo}
                  <ArrowRight size={17} />
                </Button>
              </div>
              <div className="hero-trust">
                <ShieldCheck size={16} />
                <span>Worker-first</span>
                <i />
                <Languages size={16} />
                <span>English · தமிழ் · हिन्दी</span>
              </div>
              {notifyError}
            </div>
            <div className="hero-product">
              <div className="hero-product-head">
                <span className="mini-brand" aria-label="NYAVERIS AI">
                  N<span>AI</span>
                </span>
                <span>Your fairness, in focus</span>
                <Badge tone="green">Live comparison</Badge>
              </div>
              <div className="hero-product-body">
                <div className="eyebrow">FAIRPAY TWIN / CONSTRUCTION</div>
                <h2>Every hour adds up.</h2>
                <div className="hero-hours">
                  <strong>
                    10<span>hours worked</span>
                  </strong>
                  <span>
                    <CheckCheck size={24} />
                    <small>Worker confirmed</small>
                  </span>
                </div>
                <div className="hero-amounts">
                  <div>
                    <span>Expected gross</span>
                    <strong>₹1,100</strong>
                  </div>
                  <div>
                    <span>Employer recorded</span>
                    <strong>₹950</strong>
                  </div>
                </div>
                <div className="discrepancy-callout">
                  <CircleHelp size={23} />
                  <div>
                    <b>₹150 worth a conversation.</b>
                    <p>A clear path from discrepancy to resolution.</p>
                  </div>
                </div>
                <div className="hero-proof">
                  <Fingerprint size={19} />
                  <span>Recorded. Reviewed. Accounted for.</span>
                  <ArrowRight size={16} />
                </div>
              </div>
              <div className="floating-receipt">
                <CheckCheck size={18} />
                <div>
                  <b>Accountability, built in.</b>
                  <small>Every action has a history.</small>
                </div>
              </div>
              <span className="hero-product-note">
                Illustrative scenario · explore the live demo to act on real
                synthetic records
              </span>
            </div>
          </section>
          <div className="sector-strip">
            <span>ONE PLATFORM. REAL-WORLD IMPACT.</span>
            <div>
              <HardHat size={23} />
              Construction
            </div>
            <div>
              <HeartPulse size={23} />
              Healthcare
            </div>
            <div>
              <span className="sdg-mark">8</span>Decent work & economic growth
            </div>
          </div>
          <section id="engine" className="landing-section">
            <div className="eyebrow teal">{t.proofTag}</div>
            <h2>
              From “something seems wrong”
              <br />
              to a documented way forward.
            </h2>
            <div className="feature-grid">
              {[
                {
                  icon: Wallet,
                  title: t.featureOne,
                  text: t.featureOneText,
                  index: "01",
                },
                {
                  icon: ShieldCheck,
                  title: t.featureTwo,
                  text: t.featureTwoText,
                  index: "02",
                },
                {
                  icon: Activity,
                  title: t.featureThree,
                  text: t.featureThreeText,
                  index: "03",
                },
              ].map((f) => (
                <article className="card" key={f.index}>
                  <div className="feature-top">
                    <span className="mini-icon">
                      <f.icon size={23} />
                    </span>
                    <span>{f.index}</span>
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </article>
              ))}
            </div>
          </section>
          <section className="landing-proof" id="industries">
            <div>
              <div className="eyebrow">PROOFLOOP / EVIDENCE TO ACTION</div>
              <h2>
                A shared history.
                <br />A human decision.
              </h2>
              <p>{t.rightsText}</p>
            </div>
            <div>
              <ProgressLine />
              <div className="proof-labels">
                <span>Record</span>
                <span>Compare</span>
                <span>Review</span>
                <span>Confirm</span>
              </div>
              <p>
                Append-only application history. Membership-based access. No
                invasive monitoring.
              </p>
            </div>
          </section>
        </main>
        <footer>
          <Brand />
          <p>Built for SDG 8 · PromptWars 2026</p>
          <Link to="/safety">
            {t.track}
            <ArrowUpRight size={14} />
          </Link>
        </footer>
      </div>
    );
  }
  const navKeys: TextKey[] = admin
    ? [
        "home",
        "workforce",
        "shifts",
        "payroll",
        "disputes",
        "safety",
        "rest",
        "analytics",
        "settings",
      ]
    : ["home", "shifts", "pay", "report", "cases", "rest", "profile"];
  return (
    <>
      <Routes>
        <Route path="/" element={Landing()} />
        <Route
          path="/signup"
          element={
            <AuthExperience
              key="signup"
              client={client}
              session={session}
              googleEnabled={!!config?.googleEnabled}
            />
          }
        />
        {["forgot-password", "reset-password", "verify-email"].map((path) => (
          <Route
            key={path}
            path={"/" + path}
            element={
              <AuthExperience
                key={path}
                client={client}
                session={session}
                googleEnabled={!!config?.googleEnabled}
              />
            }
          />
        ))}
        <Route
          path="/auth/callback"
          element={<AuthCallback client={client} />}
        />
        <Route path="/terms" element={<LegalPage />} />
        <Route path="/privacy" element={<LegalPage privacy />} />
        <Route
          path="/onboarding"
          element={
            <Onboarding
              api={api}
              session={session}
              enabled={!!config?.saasEnabled}
              hasMembership={!!workspace}
              onCreated={(id) =>
                openBusiness(id, "Your business is ready. Let's add your team.")
              }
            />
          }
        />
        <Route
          path="/invite"
          element={
            <InvitationExperience
              pendingInvitations={pendingInvitations}
              api={api}
              session={session}
              onAccepted={(id) =>
                openBusiness(id, "Welcome to your workplace.")
              }
            />
          }
        />

        <Route
          path="/login"
          element={session ? <Navigate to="/app/home" replace /> : Login()}
        />
        <Route
          path="/safety"
          element={
            <div className="standalone-safety">
              <div className="standalone-nav">
                <Brand />
                <LanguageSelect />
              </div>
              {notifyError}
              {SafetyPage()}
            </div>
          }
        />
        <Route
          path="/app/*"
          element={
            !config || !authReady ? (
              <div className="loading-screen">{t.loading}</div>
            ) : !session ? (
              <Navigate to="/login" replace />
            ) : needsOnboarding ? (
              <Navigate
                to={pendingInvitations.length ? "/invite" : "/onboarding"}
                replace
              />
            ) : (
              <div className="app-shell">
                <a className="skip-link" href="#main-content">
                  Skip to main content
                </a>
                {mobile && (
                  <button
                    aria-label="Close navigation"
                    className="nav-backdrop"
                    onClick={() => setMobile(false)}
                  />
                )}
                <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
                  <Brand light />
                  <div className="workspace-tag">
                    <span className="workspace-icon">
                      {org?.sector_id === "healthcare" ? (
                        <HeartPulse size={20} />
                      ) : (
                        <HardHat size={20} />
                      )}
                    </span>
                    <div>
                      <strong>{org?.name || "NYAVERIS AI"}</strong>
                      <small>{admin ? t.admin : t.worker}</small>
                    </div>
                    <span className="workspace-live" />
                  </div>
                  {workspace && workspace.memberships.length > 1 && (
                    <label className="workspace-selector">
                      Workspace
                      <select
                        aria-label="Authorized workspace"
                        value={org?.id ?? ""}
                        onChange={(e) => {
                          setSelectedOrg(e.target.value);
                          setWorkspace(null);
                        }}
                      >
                        {workspace.memberships.map((m) => (
                          <option
                            key={m.organization_id}
                            value={m.organization_id}
                          >
                            {m.organization_id === org?.id
                              ? org.name
                              : m.display_name +
                                " · " +
                                m.organization_id.slice(0, 8)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <span className="nav-label">{t.overviewLabel}</span>
                  <nav aria-label="Main navigation">
                    {admin && config.saasEnabled && !org?.is_demo && (
                      <NavLink
                        className="nav-link"
                        to="/app/employees"
                        onClick={() => setMobile(false)}
                      >
                        <UsersRound size={19} />
                        <span>Employees</span>
                      </NavLink>
                    )}
                    {!org?.is_demo && (
                      <NavLink className="nav-link" to="/onboarding">
                        Create / join workplace
                      </NavLink>
                    )}
                    {navKeys.map((key) => {
                      const Icon = iconFor[key as keyof typeof iconFor];
                      return (
                        <NavLink
                          key={key}
                          className={({ isActive }) =>
                            isActive ? "nav-link active" : "nav-link"
                          }
                          to={`/app/${key}`}
                          onClick={() => setMobile(false)}
                        >
                          <Icon size={19} />
                          <span>{t[key]}</span>
                          {key === "cases" &&
                            !!workspace?.pay_disputes.filter(
                              (d) => d.status !== "closed",
                            ).length && (
                              <em>
                                {
                                  workspace.pay_disputes.filter(
                                    (d) => d.status !== "closed",
                                  ).length
                                }
                              </em>
                            )}
                          {key === "disputes" &&
                            !!workspace?.pay_disputes.filter(
                              (d) => d.status === "requested",
                            ).length && (
                              <em>
                                {
                                  workspace.pay_disputes.filter(
                                    (d) => d.status === "requested",
                                  ).length
                                }
                              </em>
                            )}
                          {key === "home" && (
                            <span className="nav-active-dot" />
                          )}
                        </NavLink>
                      );
                    })}
                  </nav>
                  <div className="sidebar-bottom">
                    <div className="support-card">
                      <ShieldCheck size={22} />
                      <h4>Built on trust.</h4>
                      <p>
                        Transparent records.
                        <br />
                        Accountable actions.
                      </p>
                      <span>
                        SDG 8 · DECENT WORK <ArrowUpRight size={13} />
                      </span>
                    </div>
                    <button
                      className="sidebar-user"
                      onClick={() => navigate("/app/profile")}
                    >
                      <span className="avatar">
                        {workspace?.member.display_name
                          .split(" ")
                          .map((x) => x[0])
                          .join("")
                          .slice(0, 2) || "FS"}
                      </span>
                      <span>
                        <strong>
                          {workspace?.member.display_name || "NYAVERIS AI"}
                        </strong>
                        <small>
                          {admin ? "Administrator" : "Worker account"}
                        </small>
                      </span>
                      <Settings2 size={16} />
                    </button>
                  </div>
                </aside>
                <div className="workspace-main">
                  <header className="topbar">
                    <div className="breadcrumb">
                      <button
                        className="mobile-menu"
                        aria-label="Open navigation"
                        onClick={() => setMobile(true)}
                      >
                        <Menu size={21} />
                      </button>
                      <span>{admin ? t.admin : t.worker}</span>
                      <ChevronRight size={14} />
                      <b>
                        {org?.sector_id === "healthcare"
                          ? t.healthcare
                          : org?.sector_id === "generic"
                            ? "General workplace"
                            : t.construction}
                      </b>
                    </div>
                    <div className="topbar-actions">
                      <Badge tone="green">
                        <span className="status-dot" />
                        {org?.is_demo ? t.demo : "Authorized workspace"}
                      </Badge>
                      <LanguageSelect />
                      <button
                        className="icon-button"
                        aria-label={t.logout}
                        onClick={() => {
                          sessionStorage.removeItem("nyaveris-invitation");
                          void client?.auth.signOut();
                        }}
                      >
                        <LogOut size={18} />
                      </button>
                    </div>
                  </header>
                  {config.demoEnabled && org?.is_demo && (
                    <div className="demo-strip">
                      <span>
                        <Radio size={13} /> {t.demo} · {t.switch}
                      </span>
                      <div>
                        <select
                          aria-label="Demo industry"
                          value={org?.sector_id || "construction"}
                          disabled={busy}
                          onChange={(e) =>
                            void demo(
                              admin ? "admin" : "worker",
                              e.target.value as "construction" | "healthcare",
                            )
                          }
                        >
                          <option value="construction">{t.construction}</option>
                          <option value="healthcare">{t.healthcare}</option>
                        </select>
                        <button
                          disabled={busy}
                          onClick={() =>
                            void demo(
                              admin ? "worker" : "admin",
                              org?.sector_id === "healthcare"
                                ? "healthcare"
                                : "construction",
                            )
                          }
                        >
                          {admin ? t.worker : t.admin}
                          <ArrowUpRight size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                  <main
                    className="main-content"
                    id="main-content"
                    tabIndex={-1}
                  >
                    {notifyError}
                    {!workspace ? (
                      <div className="loading-screen">
                        <span className="spinner" />
                        {t.loading}
                        {error && (
                          <Button onClick={() => void reload()}>
                            {t.refresh}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Routes>
                        <Route
                          path="home"
                          element={
                            admin && !org?.is_demo ? (
                              <BusinessOverview workspace={workspace} />
                            ) : (
                              Home()
                            )
                          }
                        />
                        <Route path="shifts" element={ShiftsPage()} />
                        <Route path="pay" element={PayPage()} />
                        <Route
                          path="payroll"
                          element={
                            admin ? PayPage() : <Navigate to="/app/pay" />
                          }
                        />
                        <Route path="cases" element={CasesPage()} />
                        <Route
                          path="disputes"
                          element={
                            admin ? CasesPage() : <Navigate to="/app/cases" />
                          }
                        />
                        <Route path="report" element={SafetyPage()} />
                        <Route
                          path="safety"
                          element={admin ? AdminSafety() : SafetyPage()}
                        />
                        <Route path="rest" element={RestPage()} />
                        <Route
                          path="workforce"
                          element={
                            admin ? Workforce() : <Navigate to="/app/home" />
                          }
                        />
                        <Route
                          path="analytics"
                          element={
                            admin ? Insights() : <Navigate to="/app/home" />
                          }
                        />
                        <Route path="profile" element={Profile()} />
                        <Route
                          path="employees"
                          element={
                            admin && config.saasEnabled && !org?.is_demo ? (
                              <WorkforceManagement
                                api={api}
                                workspace={workspace}
                                reload={reload}
                              />
                            ) : (
                              <Navigate to="/app/home" />
                            )
                          }
                        />
                        <Route
                          path="settings"
                          element={
                            admin && config.saasEnabled && !org?.is_demo ? (
                              <WorkforceManagement
                                api={api}
                                workspace={workspace}
                                reload={reload}
                                settings
                              />
                            ) : (
                              Profile()
                            )
                          }
                        />
                        <Route
                          path="*"
                          element={<Navigate to="home" replace />}
                        />
                      </Routes>
                    )}
                  </main>
                  <div className="workspace-footer">
                    <span>
                      <ShieldCheck size={13} /> Fairness You Can Trace. Trust
                      You Can Prove.
                    </span>
                    <span>NYAVERIS AI</span>
                  </div>
                </div>
                <button
                  className="assistant-fab"
                  onClick={() => void ask("pay")}
                >
                  <Sparkles size={20} />
                  <span>{t.assistant}</span>
                </button>
              </div>
            )
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Modal
        open={!!modal}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
        title={
          modal?.type === "replay"
            ? t.replay
            : modal?.type === "review" || modal?.type === "clarify"
              ? t.request
              : modal?.type === "resolve"
                ? t.resolve
                : modal?.type === "safety"
                  ? t.acknowledge
                  : t.newShift
        }
        description={modal?.type === "replay" ? t.proofSub : undefined}
      >
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        {modal?.type === "replay"
          ? Replay()
          : modal?.type === "review" || modal?.type === "clarify"
            ? ReviewForm()
            : modal?.type === "resolve"
              ? ResolveForm()
              : modal?.type === "safety"
                ? SafetyUpdate()
                : modal?.type === "shift"
                  ? ShiftForm()
                  : null}
      </Modal>
      <Modal
        open={!!payrollShift}
        onOpenChange={(open) => {
          if (!open) setPayrollShift(null);
        }}
        title={t.payroll}
      >
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void run(async () => {
              await mutate("/payroll", {
                shift_id: payrollShift!.id,
                gross_paise: Math.round(Number(f.get("amount")) * 100),
                note: f.get("note"),
              });
              setPayrollShift(null);
            });
          }}
        >
          <Field label="Gross amount (₹)">
            <input
              name="amount"
              type="number"
              min="0"
              max="1000000"
              step="0.01"
              required
            />
          </Field>
          <Field label={t.note}>
            <textarea
              name="note"
              minLength={10}
              maxLength={2000}
              required
              rows={3}
            />
          </Field>
          <Button type="submit" disabled={busy}>
            {t.save}
          </Button>
        </form>
      </Modal>
      <Modal
        open={assistantOpen}
        onOpenChange={(open) => {
          setAssistantOpen(open);
          if (!open) {
            assistantGeneration.current++;
            setAssistantBusy(false);
          }
        }}
        title={t.assistant}
        description={t.assistSub}
      >
        <div className="assistant-topics">
          {(["pay", "safety", "rest", "cases"] as const).map((topic) => (
            <Button
              variant="outline"
              disabled={assistantBusy}
              key={topic}
              onClick={() => void ask(topic)}
            >
              {t[topic === "safety" ? "report" : topic]}
            </Button>
          ))}
        </div>
        {!!assistantHistory.length && (
          <details className="assistant-history">
            <summary>{assistanceCopy[language].history}</summary>
            {assistantHistory.map((turn, index) => (
              <div key={index}>
                <strong>{turn.question}</strong>
                <p>{turn.answer}</p>
              </div>
            ))}
          </details>
        )}
        {assistantError && (
          <div role="alert" className="error-banner">
            {assistantError}
            <Button
              variant="outline"
              onClick={() =>
                void ask(
                  lastAssistantRequest.current.topic,
                  lastAssistantRequest.current.question,
                )
              }
            >
              {assistanceCopy[language].retry}
            </Button>
          </div>
        )}
        {assistant ? (
          <div className="assistant-response">
            <Badge tone={assistant.source === "gemini" ? "blue" : "green"}>
              <Sparkles size={13} />
              {assistant.source === "gemini" ? t.ai : t.fallback}
            </Badge>
            <p className="assistant-explanation">{assistant.explanation}</p>
            <Button
              variant="outline"
              onClick={() => {
                const paths = {
                  pay: "/app/pay",
                  rest: "/app/rest",
                  safety: "/app/report",
                  cases: "/app/cases",
                };
                setAssistantOpen(false);
                setMobile(false);
                navigate(paths[assistant.topic || assistantTopic]);
              }}
            >
              <ArrowRight size={17} />
              {assistant.nextAction}
            </Button>
            <ReadAloud
              text={assistant.explanation}
              language={language}
              label={t.readAloud}
            />
          </div>
        ) : assistantBusy ? (
          <div className="loading-screen" role="status">
            {t.loading}
          </div>
        ) : !assistantError ? (
          <p>{t.explain}</p>
        ) : null}
        <form
          className="assistant-question"
          onSubmit={(event) => {
            event.preventDefault();
            if (assistantQuestion.trim() && !assistantBusy)
              void ask(assistantTopic, assistantQuestion.trim());
          }}
        >
          <Field
            label={assistanceCopy[language].question}
            hint={assistanceCopy[language].privacy}
          >
            <textarea
              value={assistantQuestion}
              onChange={(event) => setAssistantQuestion(event.target.value)}
              maxLength={600}
              rows={2}
              placeholder={assistanceCopy[language].placeholder}
            />
          </Field>
          <div className="form-actions">
            <Button
              type="submit"
              disabled={assistantBusy || !assistantQuestion.trim()}
            >
              {assistanceCopy[language].send}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                assistantGeneration.current++;
                setAssistant(null);
                setAssistantHistory([]);
                setAssistantQuestion("");
                setAssistantError("");
                setAssistantBusy(false);
              }}
            >
              {assistanceCopy[language].clear}
            </Button>
          </div>
        </form>
      </Modal>
      {toast && (
        <div className="toast" role="status">
          <CircleCheck size={19} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </>
  );
}
