import { readRecords } from "./records.js";
import {
  assistantFacts,
  assistantActions,
  questionIntent,
  AssistantAccessError,
} from "./assistant.js";
import { registerSaas, type Identity } from "./saas.js";
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import helmet from "helmet";
import { persistentRateLimit, type RateGuard } from "./rate-limit.js";
import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { userClient, safetyGateway } from "./supabase.js";
import {
  reviewInput,
  resolveInput,
  safetyInput,
  safetyUpdateInput,
  trackingInput,
  assistantInput,
  uuid,
} from "../shared/contracts.js";
import {
  calculatePay,
  schedulingRisks,
  shiftInput,
  policyInput,
} from "../shared/engines.js";
import { explain } from "./ai.js";

type Auth = Identity;
type AuthedRequest = Request & { identity?: Auth };
const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export function createApp(options: { rateGuard?: RateGuard } = {}) {
  const app = express();
  app.disable("x-powered-by");
  // Trust only the hosting ingress hop; addresses are HMACed before shared rate-limit storage.
  if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: [
            "'self'",
            process.env.SUPABASE_URL || "https://*.supabase.co",
          ],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
    }),
  );
  app.use(express.json({ limit: "20kb" }));
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.get(["/health", "/api/health"], (_req, res) =>
    res.json({ status: "ok", service: "NYAVERIS AI" }),
  );
  app.get("/api/config", (_req, res) =>
    res.json({
      url: process.env.SUPABASE_URL || "",
      publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || "",
      demoEnabled: process.env.ENABLE_DEMO === "true",
      saasEnabled: process.env.ENABLE_SAAS === "true",
      googleEnabled: process.env.GOOGLE_AUTH_ENABLED === "true",
      aiConfigured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL),
    }),
  );
  const limit = (scope: Parameters<typeof persistentRateLimit>[0]) =>
    persistentRateLimit(scope, options.rateGuard);
  app.post("/api/demo-session", limit("login"), async (req, res) => {
    const { sector, role } = z
      .object({
        sector: z.enum(["construction", "healthcare"]),
        role: z.enum(["worker", "admin"]),
      })
      .strict()
      .parse(req.body);
    if (process.env.ENABLE_DEMO !== "true" || !process.env.DEMO_PASSWORD)
      return res.status(404).json({ error: "Demo unavailable" });
    const c = userClient();
    const { data, error } = await c.auth.signInWithPassword({
      email: `${sector}.${role}@demo.fairshift.example`,
      password: process.env.DEMO_PASSWORD,
    });
    if (error || !data.session)
      return res.status(503).json({ error: "Demo accounts not provisioned" });
    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  });
  app.get("/api/demo-organizations", async (_req, res) => {
    if (process.env.ENABLE_DEMO !== "true") return res.json([]);
    // Only these synthetic organization IDs are intentionally public.
    res.json([
      {
        id: "10000000-0000-4000-8000-000000000001",
        name: "Buildwell Construction",
        sector: "construction",
      },
      {
        id: "10000000-0000-4000-8000-000000000002",
        name: "Lotus Care Hospital",
        sector: "healthcare",
      },
    ]);
  });
  app.post("/api/safety", limit("safety_submit"), async (req, res) => {
    const b = safetyInput.parse(req.body);
    const reference = "FS-" + randomBytes(8).toString("hex").toUpperCase(),
      token = randomBytes(32).toString("hex");
    const gateway = res.locals.gateway ?? (await safetyGateway());
    const { error } = await gateway.rpc("submit_safety", {
      p_org: b.organization_id,
      p_reference: reference,
      p_token_hash: hash(token),
      p_category: b.category,
      p_description: b.description,
      p_priority: b.priority,
    });
    if (error) throw new Error("Safety submission failed");
    res.status(201).json({ reference, token });
  });
  app.post("/api/safety/track", limit("safety_track"), async (req, res) => {
    const b = trackingInput.parse(req.body);
    const gateway = res.locals.gateway ?? (await safetyGateway());
    const { data, error } = await gateway.rpc("track_safety", {
      p_reference: b.reference,
      p_token_hash: hash(b.token),
    });
    if (error) throw new Error("Safety tracking unavailable");
    if (!data)
      return res
        .status(404)
        .json({ error: "Tracking credentials not recognized" });
    res.json(data);
  });
  app.use("/api", limit("api"));
  app.use("/api", async (req: AuthedRequest, res, next) => {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) return res.status(401).json({ error: "Sign in to continue" });
    const client = userClient(token);
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user)
      return res.status(401).json({ error: "Session expired. Sign in again." });
    const memberships = await client
      .from("organization_members")
      .select(
        process.env.ENABLE_SAAS === "true"
          ? "organization_id,role,display_name,active"
          : "organization_id,role,display_name",
      )
      .eq("user_id", data.user.id);
    if (memberships.error)
      return res
        .status(403)
        .json({ error: "No authorized organization membership" });
    req.identity = {
      client,
      userId: data.user.id,
      user: data.user,
      memberships: (
        (memberships.data ?? []) as unknown as Identity["memberships"]
      ).filter((m) => m.active !== false),
    };
    next();
  });
  const identity = (req: Request) => (req as AuthedRequest).identity!;
  registerSaas(app, identity);
  app.use("/api", (req, res, next) => {
    if (!identity(req).memberships.length)
      return res
        .status(403)
        .json({ error: "No authorized organization membership" });
    next();
  });
  const rpc = async (
    req: Request,
    res: Response,
    name: string,
    args: Record<string, unknown>,
  ) => {
    const { data, error } = await identity(req).client.rpc(name, args);
    if (error)
      return res.status(error.code === "23505" ? 409 : 403).json({
        error:
          error.code === "23505"
            ? "An open review already exists for this shift."
            : "Action denied. Check permissions, case status and input. Verified records cannot be silently overwritten.",
      });
    res.json({ data, success: true });
  };
  app.get("/api/workspace", async (req, res) => {
    const { client, userId, memberships } = identity(req);
    const orgId = z
      .string()
      .uuid()
      .parse(req.query.org || memberships[0].organization_id);
    const member = memberships.find((m) => m.organization_id === orgId);
    if (!member)
      return res.status(403).json({ error: "Organization access denied" });
    const names = [
      "organizations",
      "pay_policies",
      "organization_members",
      "shifts",
      "payroll_entries",
      "pay_disputes",
      "dispute_events",
      "safety_reports",
      "safety_case_events",
    ] as const;
    const results = await Promise.all(
      names.map((name) =>
        readRecords((offset) => {
          let q = client
            .from(name)
            .select("*")
            .range(offset, offset + 499)
            .order(name === "payroll_entries" ? "shift_id" : "id");
          if (name === "organization_members")
            q = client
              .from(name)
              .select("*")
              .range(offset, offset + 499)
              .order("user_id");
          if (name === "pay_policies")
            q = client
              .from(name)
              .select("*")
              .range(offset, offset + 499)
              .order("organization_id");
          if (name === "organizations") q = q.eq("id", orgId);
          else if (!["payroll_entries", "safety_case_events"].includes(name))
            q = q.eq("organization_id", orgId);
          return q;
        }),
      ),
    );
    if (results.some((r) => r.error))
      throw new Error("Unable to load workspace");
    const rows = Object.fromEntries(
      names.map((name, i) => [name, results[i].data || []]),
    );
    const shifts = rows.shifts.filter((s) => !s.cancelled_at),
      shiftIds = new Set(shifts.map((s) => s.id));
    rows.payroll_entries = rows.payroll_entries.filter((p) =>
      shiftIds.has(p.shift_id),
    );
    const reportIds = new Set(rows.safety_reports.map((r) => r.id));
    rows.safety_case_events = rows.safety_case_events.filter((e) =>
      reportIds.has(e.report_id),
    );
    let businessEvents: Record<string, unknown>[] = [];
    let employees: Record<string, unknown>[] = [];
    if (process.env.ENABLE_SAAS === "true") {
      const profiles = await readRecords((offset) =>
        client
          .from("employee_profiles")
          .select("*")
          .eq("organization_id", orgId)
          .order("id")
          .range(offset, offset + 499),
      );
      if (profiles.error) throw new Error("Unable to load employee policies");
      employees = profiles.data ?? [];
      if (member.role === "admin") {
        const events = await readRecords((offset) =>
          client
            .from("business_events")
            .select("*")
            .eq("organization_id", orgId)
            .order("id")
            .range(offset, offset + 499),
        );
        if (events.error)
          throw new Error("Unable to load business audit history");
        businessEvents = events.data;
      }
    }
    const policy = policyInput.parse(rows.pay_policies[0]);
    const employeePolicy = (workerId: string) => {
      const e = employees.find((e) => e.user_id === workerId);
      return e
        ? {
            ...policy,
            basis: e.pay_basis,
            hourly_paise:
              e.pay_basis === "hourly" ? e.rate_paise : policy.hourly_paise,
            daily_paise:
              e.pay_basis === "daily" ? e.rate_paise : policy.daily_paise,
          }
        : policy;
    };
    const pay = shifts.map((s) => ({
      shiftId: s.id,
      ...calculatePay(
        s,
        policyInput.parse(employeePolicy(s.worker_id)),
        rows.payroll_entries.find((p) => p.shift_id === s.id)?.gross_paise ?? 0,
      ),
      hasPayroll: rows.payroll_entries.some((p) => p.shift_id === s.id),
    }));
    const risks = schedulingRisks(shifts, policy);
    res.json({
      userId,
      member,
      memberships,
      ...rows,
      shifts,
      employee_profiles: employees,
      business_events: businessEvents,
      pay,
      risks,
    });
  });
  app.post("/api/reviews", async (req, res) => {
    const b = reviewInput.parse(req.body);
    await rpc(req, res, "request_review", {
      p_shift: b.shift_id,
      p_reason: b.reason,
    });
  });
  app.post("/api/reviews/resolve", async (req, res) => {
    const b = resolveInput.parse(req.body);
    await rpc(req, res, "resolve_review", {
      p_dispute: b.dispute_id,
      p_paise: b.corrected_paise,
      p_explanation: b.explanation,
    });
  });
  app.post("/api/reviews/confirm", async (req, res) => {
    const b = z.object({ dispute_id: uuid }).strict().parse(req.body);
    await rpc(req, res, "confirm_resolution", { p_dispute: b.dispute_id });
  });
  app.post("/api/shifts/confirm", async (req, res) => {
    const b = z.object({ shift_id: uuid }).strict().parse(req.body);
    await rpc(req, res, "confirm_shift", { p_shift: b.shift_id });
  });
  app.post("/api/shifts", async (req, res) => {
    const b = z
      .object({
        id: uuid.nullable().default(null),
        organization_id: uuid,
        worker_id: uuid,
        starts_at: z.string(),
        ends_at: z.string(),
        break_minutes: z.number(),
        location: z.string().trim().min(2).max(100),
      })
      .strict()
      .parse(req.body);
    shiftInput.parse(b);
    await rpc(req, res, "save_shift", {
      p_id: b.id,
      p_org: b.organization_id,
      p_worker: b.worker_id,
      p_start: b.starts_at,
      p_end: b.ends_at,
      p_break: b.break_minutes,
      p_location: b.location,
    });
  });
  app.post("/api/policies", async (req, res) => {
    const b = policyInput
      .extend({
        organization_id: uuid,
        note: z.string().trim().min(10).max(2000),
      })
      .strict()
      .parse(req.body);
    if (b.basis === "daily" && !b.daily_paise)
      return res.status(400).json({ error: "Daily rate is required" });
    const { organization_id, note, ...policy } = b;
    await rpc(req, res, "configure_pay_policy", {
      p_org: organization_id,
      p_policy: {
        ...policy,
        basis: policy.basis || "hourly",
        daily_paise: policy.daily_paise || 80000,
      },
      p_note: note,
    });
  });
  app.post("/api/reviews/reopen", async (req, res) => {
    const b = z
      .object({ dispute_id: uuid, reason: z.string().trim().min(10).max(1000) })
      .strict()
      .parse(req.body);
    await rpc(req, res, "reopen_review", {
      p_dispute: b.dispute_id,
      p_reason: b.reason,
    });
  });
  app.post("/api/payroll", async (req, res) => {
    const b = z
      .object({
        shift_id: uuid,
        gross_paise: z.number().int().min(0).max(100000000),
        note: z.string().trim().min(10).max(2000),
      })
      .strict()
      .parse(req.body);
    await rpc(req, res, "record_payroll", {
      p_shift: b.shift_id,
      p_paise: b.gross_paise,
      p_note: b.note,
    });
  });
  app.post("/api/safety/update", async (req, res) => {
    const b = safetyUpdateInput.parse(req.body);
    await rpc(req, res, "update_safety", {
      p_report: b.report_id,
      p_status: b.status,
      p_note: b.note,
    });
  });
  app.post("/api/assistant", limit("assistant"), async (req, res) => {
    const b = assistantInput.parse(req.body);
    const i = identity(req);
    const org = b.organization_id || i.memberships[0].organization_id;
    if (!i.memberships.some((m) => m.organization_id === org))
      return res.status(403).json({ error: "Organization access denied" });
    const selected = questionIntent(b.topic, b.question);
    try {
      const facts = await assistantFacts(
        i,
        selected.topic,
        selected.intent,
        org,
        selected.intent === "recent_shifts" ? undefined : b.shift_id,
      );
      const answer = await explain(selected.topic, b.language, facts);
      const action = assistantActions[selected.topic];
      res.json({
        ...answer,
        topic: selected.topic,
        intent: selected.intent,
        nextAction: action[b.language],
        actionPath: action.path,
      });
    } catch (error) {
      if (error instanceof AssistantAccessError)
        return res.status(403).json({ error: "Shift access denied" });
      throw error;
    }
  });
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof z.ZodError)
      return res
        .status(400)
        .json({ error: err.issues.map((i) => i.message).join("; ") });
    if ((err as { type?: string })?.type === "entity.too.large")
      return res.status(413).json({ error: "Request is too large" });
    if (err instanceof SyntaxError)
      return res.status(400).json({ error: "Invalid JSON" });
    console.error(
      JSON.stringify({
        event: "request_failed",
        method: _req.method,
        path: _req.path,
        errorType: err instanceof Error ? err.name : "UnknownError",
      }),
    );
    res.status(503).json({
      error:
        "Service unavailable. Please retry. If this continues, check server configuration.",
    });
  });
  return app;
}
