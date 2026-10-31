import {
  calculatePay,
  policyInput,
  schedulingRisks,
  type Shift,
} from "../shared/engines.js";
import { readRecords } from "./records.js";
import type { Identity } from "./saas.js";

export type Topic = "pay" | "rest" | "safety" | "cases";
export type Intent = "overview" | "overtime" | "recent_shifts" | "unsupported";
export type AssistantFacts = {
  intent: Intent;
  scope?: "personal" | "organization";
  timezone?: string;
  shiftCount?: number;
  shifts?: {
    date: string;
    confirmed: boolean;
    payableMinutes: number;
    overtimeMinutes: number;
    expectedPaise: number;
    recordedPaise: number | null;
    discrepancyPaise: number | null;
  }[];
  risks?: Record<string, number>;
  restExamples?: {
    date: string;
    kind: "overlap" | "short_rest";
    minutes: number;
    requiredMinutes: number;
  }[];
  cases?: { requested: number; responded: number; closed: number };
};

// Raw questions (which can contain names or tracking secrets) never leave the
// application. Only a bounded intent and projected record facts reach Gemini.
export function questionIntent(
  topic: Topic,
  question?: string,
): { topic: Topic; intent: Intent } {
  if (!question) return { topic, intent: "overview" };
  const q = question.toLocaleLowerCase();
  if (/unsafe|hazard|safety|report|புகார்|பாதுகாப்ப|सुरक्षा|शिकायत/.test(q))
    return { topic: "safety", intent: "overview" };
  if (/dispute|case|review|வழக்கு|மறுஆய்வு|विवाद|मामल|समीक्षा/.test(q))
    return { topic: "cases", intent: "overview" };
  if (/rest|overlap|tired|warning|ஓய்வு|எச்சரிக்கை|आराम|चेतावनी/.test(q))
    return { topic: "rest", intent: "overview" };
  if (
    /last|recent|five|5|கடைசி|சமீப|पिछल|हाल/.test(q) &&
    /shift|பணி|शिफ्ट/.test(q)
  )
    return { topic: "pay", intent: "recent_shifts" };
  if (/overtime|கூடுதல்|மேலதிக|ओवरटाइम|अतिरिक्त/.test(q))
    return { topic: "pay", intent: "overtime" };
  if (/pay|salary|wage|earn|hours|ஊதிய|சம்பள|நேரம்|वेतन|तनख्वाह|घंट/.test(q))
    return { topic: "pay", intent: "overview" };
  if (/why|explain|more|that|இத|விளக்|ஏன்|क्यों|समझा|बताओ/.test(q))
    return { topic, intent: "overview" };
  return { topic, intent: "unsupported" };
}

type StoredShift = Shift & {
  id: string;
  organization_id: string;
  worker_id: string;
  cancelled_at?: string | null;
};
export class AssistantAccessError extends Error {}
export async function assistantFacts(
  identity: Identity,
  topic: Topic,
  intent: Intent,
  org: string,
  shiftId?: string,
): Promise<AssistantFacts> {
  const member = identity.memberships.find((m) => m.organization_id === org);
  if (!member)
    throw new AssistantAccessError("Assistant organization access denied");
  if (topic === "safety" || intent === "unsupported") return { intent };
  const client = identity.client;
  if (topic === "cases") {
    const result = await readRecords((offset) => {
      let query = client
        .from("pay_disputes")
        .select("status,worker_id,organization_id")
        .eq("organization_id", org)
        .order("id")
        .range(offset, offset + 499);
      if (member.role !== "admin")
        query = query.eq("worker_id", identity.userId);
      return query;
    });
    if (result.error) throw new Error("Assistant cases unavailable");
    const own = result.data.filter(
      (r) =>
        (member.role === "admin" || r.worker_id === identity.userId) &&
        r.organization_id === org,
    );
    return {
      intent,
      scope: member.role === "admin" ? "organization" : "personal",
      cases: {
        requested: own.filter((r) => r.status === "requested").length,
        responded: own.filter((r) => r.status === "responded").length,
        closed: own.filter((r) => r.status === "closed").length,
      },
    };
  }
  let workerId = identity.userId;
  const organizationRest =
    topic === "rest" && member.role === "admin" && !shiftId;
  if (shiftId) {
    const selected = await client
      .from("shifts")
      .select("*")
      .eq("id", shiftId)
      .single();
    if (
      selected.error ||
      !selected.data ||
      selected.data.organization_id !== org ||
      (selected.data.worker_id !== identity.userId && member.role !== "admin")
    )
      throw new AssistantAccessError("Assistant shift access denied");
    workerId = selected.data.worker_id;
  }
  const [loaded, policy] = await Promise.all([
    readRecords((offset) => {
      let query = client
        .from("shifts")
        .select("*")
        .eq("organization_id", org)
        .order("id")
        .range(offset, offset + 499);
      if (!organizationRest) query = query.eq("worker_id", workerId);
      return query;
    }),
    client.from("pay_policies").select("*").eq("organization_id", org).single(),
  ]);
  if (loaded.error || policy.error || !policy.data)
    throw new Error("Assistant records unavailable");
  const shifts = (loaded.data as StoredShift[]).filter(
    (s) =>
      s.organization_id === org &&
      (organizationRest || s.worker_id === workerId) &&
      !s.cancelled_at,
  );
  let rates = policyInput.parse(policy.data);
  if (process.env.ENABLE_SAAS === "true" && !organizationRest) {
    const employee = await client
      .from("employee_profiles")
      .select("pay_basis,rate_paise")
      .eq("organization_id", org)
      .eq("user_id", workerId)
      .maybeSingle();
    if (employee.error) throw new Error("Assistant policy unavailable");
    if (employee.data)
      rates = policyInput.parse({
        ...rates,
        basis: employee.data.pay_basis,
        ...(employee.data.pay_basis === "daily"
          ? { daily_paise: employee.data.rate_paise }
          : { hourly_paise: employee.data.rate_paise }),
      });
  }
  if (topic === "rest") {
    const risks = schedulingRisks(shifts, rates);
    return {
      intent,
      timezone: rates.timezone,
      scope: organizationRest ? "organization" : "personal",
      shiftCount: shifts.length,
      risks: Object.fromEntries(
        [
          "overlap",
          "short_rest",
          "long_shift",
          "repeated_overtime",
          "consecutive_days",
        ].map((type) => [type, risks.filter((r) => r.type === type).length]),
      ),
      restExamples: risks
        .filter(
          (r) =>
            (r.type === "overlap" || r.type === "short_rest") &&
            r.minutes !== undefined,
        )
        .map((r) => ({
          date: shifts.find((s) => s.id === r.shiftId)!.starts_at,
          kind: r.type as "overlap" | "short_rest",
          minutes: r.minutes!,
          requiredMinutes: r.requiredMinutes!,
        }))
        .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
        .slice(0, 5),
    };
  }
  const recent = shifts
    .sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at))
    .filter((s) => !shiftId || s.id === shiftId)
    .filter((s) =>
      intent === "overtime"
        ? !!s.confirmed && Date.parse(s.ends_at) <= Date.now()
        : intent === "recent_shifts"
          ? Date.parse(s.starts_at) <= Date.now()
          : true,
    )
    .slice(0, 5);
  const facts = await Promise.all(
    recent.map(async (s) => {
      const payroll = await client
        .from("payroll_entries")
        .select("gross_paise")
        .eq("shift_id", s.id)
        .maybeSingle();
      if (payroll.error) throw new Error("Assistant payroll unavailable");
      const pay = calculatePay(s, rates, payroll.data?.gross_paise ?? 0);
      return {
        date: s.starts_at,
        confirmed: !!s.confirmed,
        payableMinutes: pay.payableMinutes,
        overtimeMinutes: pay.overtimeMinutes,
        expectedPaise: pay.expectedPaise,
        recordedPaise: payroll.data ? pay.recordedPaise : null,
        discrepancyPaise: payroll.data ? pay.discrepancyPaise : null,
      };
    }),
  );
  return {
    intent,
    timezone: rates.timezone,
    shiftCount: shifts.length,
    shifts: facts,
  };
}

export const assistantActions = {
  pay: {
    path: "/app/pay",
    en: "View payroll details",
    ta: "ஊதிய விவரங்களைப் பார்",
    hi: "वेतन विवरण देखें",
  },
  rest: {
    path: "/app/rest",
    en: "View RestGuard warnings",
    ta: "ஓய்வு எச்சரிக்கைகளைப் பார்",
    hi: "आराम की चेतावनियाँ देखें",
  },
  safety: {
    path: "/app/report",
    en: "Submit safety concern",
    ta: "பாதுகாப்புப் புகாரை அளி",
    hi: "सुरक्षा चिंता दर्ज करें",
  },
  cases: {
    path: "/app/cases",
    en: "Open my disputes",
    ta: "என் வழக்குகளைத் திற",
    hi: "मेरे विवाद खोलें",
  },
} as const;
