import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../server/app";

// Exercise real Express validation/auth/orchestration with a controlled database
// adapter. These tests deliberately make no hosted database or Auth requests.
const db = vi.hoisted(() => ({
  user: "20000000-0000-4000-8000-000000000001" as string | null,
  role: "worker",
  rpc: vi.fn(),
  getUser: vi.fn(),
  signInWithPassword: vi.fn(),
  eq: vi.fn(),
  tables: {} as Record<string, Record<string, unknown>[]>,
  queryError: false,
  queryErrors: [] as string[],
}));

vi.mock("../server/supabase.js", () => {
  const client = {
    auth: {
      getUser: db.getUser,
      signInWithPassword: db.signInWithPassword,
    },
    rpc: db.rpc,
    from: (name: string) => {
      const result = () => ({
        data:
          db.queryError || db.queryErrors.includes(name)
            ? null
            : (db.tables[name] ?? []),
        error:
          db.queryError || db.queryErrors.includes(name)
            ? { message: "private database diagnostic" }
            : null,
      });
      const query = {
        select: () => query,
        limit: () => query,
        range: () => query,
        order: () => query,
        eq: (...args: unknown[]) => {
          db.eq(name, ...args);
          return query;
        },
        single: async () => ({ ...result(), data: result().data?.[0] ?? null }),
        maybeSingle: async () => ({
          ...result(),
          data: result().data?.[0] ?? null,
        }),
        then: <T>(resolve: (value: ReturnType<typeof result>) => T) =>
          Promise.resolve(result()).then(resolve),
      };
      return query;
    },
  };
  return { userClient: () => client, safetyGateway: async () => client };
});

const org = "10000000-0000-4000-8000-000000000001";
const otherOrg = "10000000-0000-4000-8000-000000000002";
const shift = "30000000-0000-4000-8000-000000000001";
const dispute = "40000000-0000-4000-8000-000000000001";
const policy = {
  hourly_paise: 10000,
  regular_minutes: 480,
  overtime_bps: 15000,
  min_rest_minutes: 660,
  max_shift_minutes: 720,
  max_consecutive_days: 6,
  timezone: "Asia/Kolkata",
};
const app = createApp({
  rateGuard: async () => ({ allowed: true, retryAfter: 60 }),
});
const authenticated = (path: string) =>
  request(app)
    .post("/api" + path)
    .set("Authorization", "Bearer synthetic-test-token");

beforeEach(() => {
  vi.clearAllMocks();
  db.user = "20000000-0000-4000-8000-000000000001";
  db.role = "worker";
  db.queryError = false;
  db.queryErrors = [];
  db.rpc.mockResolvedValue({ data: dispute, error: null });
  db.getUser.mockImplementation(async () => ({
    data: {
      user: db.user ? { id: db.user, user_metadata: { role: "admin" } } : null,
    },
    error: null,
  }));
  db.tables = {
    organization_members: [
      {
        user_id: db.user,
        organization_id: org,
        role: db.role,
        display_name: "Synthetic worker",
      },
    ],
    organizations: [
      {
        id: org,
        name: "Synthetic construction",
        sector_id: "construction",
        is_demo: true,
      },
    ],
    pay_policies: [policy],
    shifts: [
      {
        id: shift,
        worker_id: db.user,
        organization_id: org,
        starts_at: "2026-10-26T08:00:00+05:30",
        ends_at: "2026-10-26T18:30:00+05:30",
        break_minutes: 30,
        confirmed: true,
        location: "Synthetic site",
      },
    ],
    payroll_entries: [{ shift_id: shift, gross_paise: 95000 }],
    safety_reports: [],
  };
});

afterEach(() => vi.unstubAllEnvs());

describe("SaaS authenticated onboarding boundary", () => {
  beforeEach(() => {
    vi.stubEnv("ENABLE_SAAS", "true");
    vi.stubEnv("APP_ORIGIN", "https://nyaveris-ai.vercel.app");
    db.getUser.mockResolvedValue({
      data: {
        user: {
          id: db.user,
          email: "worker@example.test",
          email_confirmed_at: "2026-10-31T00:00:00Z",
          user_metadata: { role: "admin" },
        },
      },
      error: null,
    });
  });
  it("discovers onboarding without granting workspace access", async () => {
    db.tables.organization_members = [];
    const r = await request(app)
      .get("/api/account")
      .set("Authorization", "Bearer synthetic");
    expect(r.status).toBe(200);
    expect(r.body.memberships).toEqual([]);
    expect(
      (
        await request(app)
          .get("/api/workspace")
          .set("Authorization", "Bearer synthetic")
      ).status,
    ).toBe(403);
  });
  it("passes only a hash for existing-user invitation acceptance", async () => {
    db.tables.organization_members = [];
    const r = await authenticated("/invitations/accept").send({
      token: "a".repeat(64),
    });
    expect(r.status).toBe(200);
    expect(db.rpc).toHaveBeenCalledWith("saas_action", {
      p_action: "accept_invitation",
      p_org: null,
      p_data: {
        token_hash: createHash("sha256").update("a".repeat(64)).digest("hex"),
      },
    });
  });
  it("requires authenticated account discovery", async () =>
    expect((await request(app).get("/api/account")).status).toBe(401));
  it("rejects unverified acceptance before an RPC", async () => {
    db.getUser.mockResolvedValue({
      data: { user: { id: db.user, email_confirmed_at: null } },
      error: null,
    });
    expect(
      (
        await authenticated("/invitations/accept").send({
          token: "a".repeat(64),
        })
      ).status,
    ).toBe(403);
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it("denies workforce records to a worker", async () =>
    expect(
      (
        await request(app)
          .get("/api/employees?org=" + org)
          .set("Authorization", "Bearer synthetic")
      ).status,
    ).toBe(403));
  it("rejects forged invitation privileges", async () => {
    expect(
      (
        await authenticated("/invitations/accept").send({
          token: "a".repeat(64),
          role: "admin",
        })
      ).status,
    ).toBe(400);
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it("reports missing migrations without database diagnostics", async () => {
    db.rpc.mockResolvedValue({
      data: null,
      error: { code: "PGRST202", message: "private details" },
    });
    const r = await authenticated("/invitations/accept").send({
      token: "a".repeat(64),
    });
    expect(r.status).toBe(503);
    expect(r.body.error).toContain("approved database migration");
    expect(JSON.stringify(r.body)).not.toContain("private details");
  });
  it("excludes deactivated memberships from routing", async () => {
    db.tables.organization_members = [
      { organization_id: org, user_id: db.user, role: "worker", active: false },
    ];
    const r = await request(app)
      .get("/api/account")
      .set("Authorization", "Bearer synthetic");
    expect(r.body.memberships).toEqual([]);
  });
  it("gates new writes before rollout", async () => {
    vi.stubEnv("ENABLE_SAAS", "false");
    expect(
      (
        await authenticated("/invitations/accept").send({
          token: "a".repeat(64),
        })
      ).status,
    ).toBe(503);
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it.each(["/invitations", "/invitations/resend"])(
    "does not create or rotate a token when its business cannot be read at %s",
    async (path) => {
      vi.stubEnv("APP_ORIGIN", "https://example.test");
      db.tables.organizations = [];
      const result = await authenticated(path).send({
        organization_id: org,
        ...(path.endsWith("resend")
          ? { invitation_id: dispute }
          : { employee_id: db.user }),
      });
      expect(result.status).toBe(403);
      expect(db.rpc).not.toHaveBeenCalled();
      expect(db.eq).toHaveBeenCalledWith("organizations", "id", org);
    },
  );
});

describe("authenticated API orchestration (isolated adapter)", () => {
  it.each([
    "reviews",
    "reviews/resolve",
    "reviews/confirm",
    "reviews/reopen",
    "shifts",
    "shifts/confirm",
    "payroll",
    "policies",
    "safety/update",
    "assistant",
  ])(
    "rejects malformed authenticated input at /%s before an RPC",
    async (path) => {
      expect((await authenticated(`/${path}`).send({})).status).toBe(400);
      expect(db.rpc).not.toHaveBeenCalled();
    },
  );
  it("forwards a validated policy version and review reopening to their existing RPCs", async () => {
    expect(
      (
        await authenticated("/policies").send({
          ...policy,
          organization_id: org,
          note: "Verified synthetic policy change.",
        })
      ).status,
    ).toBe(200);
    expect(db.rpc).toHaveBeenLastCalledWith("configure_pay_policy", {
      p_org: org,
      p_policy: { ...policy, basis: "hourly", daily_paise: 80000 },
      p_note: "Verified synthetic policy change.",
    });
    expect(
      (
        await authenticated("/reviews/reopen").send({
          dispute_id: dispute,
          reason: "Please clarify the correction.",
        })
      ).status,
    ).toBe(200);
    expect(db.rpc).toHaveBeenLastCalledWith("reopen_review", {
      p_dispute: dispute,
      p_reason: "Please clarify the correction.",
    });
  });
  it.each(["pay_policies", "payroll_entries"])(
    "does not explain invented pay when the %s read fails",
    async (table) => {
      db.queryErrors = [table];
      const response = await authenticated("/assistant").send({
        topic: "pay",
        language: "en",
        shift_id: shift,
      });
      expect(response.status).toBe(503);
      expect(response.body).not.toHaveProperty("explanation");
      expect(response.text).not.toContain("private database diagnostic");
    },
  );
  it.each(["worker", "admin"])(
    "preserves %s demo login without accepting a supplied account",
    async (role) => {
      vi.stubEnv("ENABLE_DEMO", "true");
      vi.stubEnv("DEMO_PASSWORD", "synthetic-test-password");
      db.signInWithPassword.mockResolvedValue({
        data: {
          session: {
            access_token: "synthetic-access",
            refresh_token: "synthetic-refresh",
          },
        },
        error: null,
      });
      const response = await request(app)
        .post("/api/demo-session")
        .send({ role, sector: "healthcare" });
      expect(response.status).toBe(200);
      expect(db.signInWithPassword).toHaveBeenCalledWith({
        email: `healthcare.${role}@demo.fairshift.example`,
        password: "synthetic-test-password",
      });
      expect(response.body).toEqual({
        access_token: "synthetic-access",
        refresh_token: "synthetic-refresh",
      });
    },
  );
  it("returns unavailable when demo credentials are rejected", async () => {
    vi.stubEnv("ENABLE_DEMO", "true");
    vi.stubEnv("DEMO_PASSWORD", "synthetic-test-password");
    db.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: "private diagnostic" },
    });
    const response = await request(app)
      .post("/api/demo-session")
      .send({ role: "worker", sector: "construction" });
    expect(response.status).toBe(503);
    expect(response.text).not.toContain("private diagnostic");
  });
  it("returns multilingual assistant fallback through the protected route", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const response = await authenticated("/assistant").send({
      topic: "pay",
      language: "ta",
      shift_id: shift,
    });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      source: "fallback",
      explanation: expect.stringContaining("ஊதியம்"),
    });
    expect(db.eq).toHaveBeenCalledWith("shifts", "id", shift);
    expect(response.text).not.toContain(db.user);
  });
  it("denies a foreign assistant organization before reading records", async () => {
    const response = await authenticated("/assistant").send({
      topic: "pay",
      language: "en",
      organization_id: otherOrg,
      question: "Explain my pay",
    });
    expect(response.status).toBe(403);
    expect(
      db.eq.mock.calls.filter(([table]) => table !== "organization_members"),
    ).toEqual([]);
  });
  it("does not let a worker use a known other-worker shift identifier", async () => {
    db.tables.shifts[0].worker_id = "20000000-0000-4000-8000-000000000099";
    const response = await authenticated("/assistant").send({
      topic: "pay",
      language: "en",
      shift_id: shift,
    });
    expect(response.status).toBe(403);
  });
  it("provides private case status counts without exposing reasons, people or other workers", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    db.tables.pay_disputes = [
      {
        organization_id: org,
        worker_id: db.user,
        status: "responded",
        reason: "private reason",
      },
      {
        organization_id: org,
        worker_id: "another-person",
        status: "requested",
        reason: "another private reason",
      },
    ];
    const response = await authenticated("/assistant").send({
      topic: "pay",
      language: "en",
      question: "What happened to my payroll dispute?",
    });
    expect(response.status).toBe(200);
    expect(response.body.topic).toBe("cases");
    expect(response.body.actionPath).toBe("/app/cases");
    expect(response.body.explanation).toContain(
      "Awaiting your confirmation: 1",
    );
    expect(response.body.explanation).toContain(
      "Awaiting employer response: 0",
    );
    expect(response.text).not.toMatch(/private reason|another-person/);
  });
  it("returns actionable safety instructions without reading anonymous report contents", async () => {
    const response = await authenticated("/assistant").send({
      topic: "safety",
      language: "en",
      question: "How do I report an unsafe workplace?",
    });
    expect(response.status).toBe(200);
    expect(response.body.actionPath).toBe("/app/report");
    expect(response.body.nextAction).toBe("Submit safety concern");
    expect(
      db.eq.mock.calls.filter(([table]) => table === "safety_reports"),
    ).toEqual([]);
  });
  it("gives a protected administrator organization-wide rest context without leaking worker identities", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("ENABLE_SAAS", "false");
    db.tables.organization_members[0].role = "admin";
    db.tables.shifts.push({
      ...db.tables.shifts[0],
      id: "30000000-0000-4000-8000-000000000099",
      worker_id: "another-private-worker",
      starts_at: "2026-10-26T09:00:00+05:30",
      ends_at: "2026-10-26T10:00:00+05:30",
      break_minutes: 0,
    });
    db.tables.shifts.push({
      ...db.tables.shifts[0],
      id: "foreign-shift",
      organization_id: otherOrg,
    });
    const response = await authenticated("/assistant").send({
      topic: "rest",
      language: "en",
    });
    expect(response.status).toBe(200);
    expect(response.body.explanation).toContain("Workplace scheduling signals");
    // Different workers are never compared, even in the administrator view.
    expect(response.body.explanation).toContain("Overlapping shifts: 0");
    expect(response.text).not.toMatch(/another-private-worker|foreign-shift/);
    expect(
      db.eq.mock.calls.filter(
        ([table, field]) => table === "shifts" && field === "worker_id",
      ),
    ).toEqual([]);
  });
  it("does not describe future scheduled overtime as hours already worked", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    db.tables.shifts.push({
      ...db.tables.shifts[0],
      id: "30000000-0000-4000-8000-000000000098",
      starts_at: "2999-02-02T08:00:00+05:30",
      ends_at: "2999-02-02T20:00:00+05:30",
      confirmed: false,
    });
    for (const question of [
      "How much overtime did I work?",
      "Explain my last five shifts.",
    ]) {
      const response = await authenticated("/assistant").send({
        topic: "pay",
        language: "en",
        question,
      });
      expect(response.status).toBe(200);
      expect(response.body.explanation).not.toContain("2999");
      expect(response.body.explanation).toContain("Shifts considered: 1");
    }
  });
  it("verifies bearer identity and protected membership rather than metadata roles", async () => {
    const response = await request(app)
      .get("/api/workspace")
      .set("Authorization", "Bearer synthetic-test-token");
    expect(response.status).toBe(200);
    expect(db.getUser).toHaveBeenCalledWith("synthetic-test-token");
    expect(db.eq).toHaveBeenCalledWith(
      "organization_members",
      "user_id",
      db.user,
    );
    expect(response.body.member.role).toBe("worker");
    expect(response.body.pay[0]).toMatchObject({
      expectedPaise: 110000,
      recordedPaise: 95000,
      discrepancyPaise: 15000,
      hasPayroll: true,
    });
  });
  it("returns 401 for an expired bearer identity before business access", async () => {
    db.user = null;
    const response = await authenticated("/reviews").send({
      shift_id: shift,
      reason: "Please review my overtime.",
    });
    expect(response.status).toBe(401);
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it("returns 403 when a valid user lacks protected membership", async () => {
    db.tables.organization_members = [];
    expect((await authenticated("/reviews").send({})).status).toBe(403);
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it("rejects a foreign organization before loading its data", async () => {
    const response = await request(app)
      .get(`/api/workspace?org=${otherOrg}`)
      .set("Authorization", "Bearer synthetic-test-token");
    expect(response.status).toBe(403);
    expect(
      db.eq.mock.calls.filter(([name]) => name !== "organization_members"),
    ).toEqual([]);
  });
  it("distinguishes missing payroll from recorded zero", async () => {
    db.tables.payroll_entries = [];
    const response = await request(app)
      .get("/api/workspace")
      .set("Authorization", "Bearer synthetic-test-token");
    expect(response.body.pay[0]).toMatchObject({
      hasPayroll: false,
      recordedPaise: 0,
    });
    db.tables.payroll_entries = [{ shift_id: shift, gross_paise: 0 }];
    const zero = await request(app)
      .get("/api/workspace")
      .set("Authorization", "Bearer synthetic-test-token");
    expect(zero.body.pay[0]).toMatchObject({
      hasPayroll: true,
      recordedPaise: 0,
    });
  });
  it("sends a validated review to the transactional RPC", async () => {
    const response = await authenticated("/reviews").send({
      shift_id: shift,
      reason: "  Please review my overtime.  ",
    });
    expect(response.status).toBe(200);
    expect(db.rpc).toHaveBeenCalledExactlyOnceWith("request_review", {
      p_shift: shift,
      p_reason: "Please review my overtime.",
    });
  });
  it("rejects forged identity/role fields rather than forwarding them", async () => {
    expect(
      (
        await authenticated("/reviews").send({
          shift_id: shift,
          reason: "Please review my overtime.",
          role: "admin",
          worker_id: db.user,
        })
      ).status,
    ).toBe(400);
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it("preserves duplicate-review conflicts and hides database diagnostics", async () => {
    db.rpc.mockResolvedValue({
      data: null,
      error: { code: "23505", message: "private table diagnostic" },
    });
    const response = await authenticated("/reviews").send({
      shift_id: shift,
      reason: "Please review my overtime.",
    });
    expect(response.status).toBe(409);
    expect(response.body.error).toContain("already exists");
    expect(response.text).not.toContain("private table");
  });
  it("preserves permission denial returned by the database for payroll changes", async () => {
    db.rpc.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "private policy details" },
    });
    const response = await authenticated("/payroll").send({
      shift_id: shift,
      gross_paise: 110000,
      note: "Verified overtime correction.",
    });
    expect(response.status).toBe(403);
    expect(response.text).not.toContain("private policy");
  });
  it("forwards employer response and worker confirmation to separate atomic RPCs", async () => {
    expect(
      (
        await authenticated("/reviews/resolve").send({
          dispute_id: dispute,
          corrected_paise: 110000,
          explanation: "Verified overtime correction.",
        })
      ).status,
    ).toBe(200);
    expect(db.rpc).toHaveBeenLastCalledWith("resolve_review", {
      p_dispute: dispute,
      p_paise: 110000,
      p_explanation: "Verified overtime correction.",
    });
    expect(
      (await authenticated("/reviews/confirm").send({ dispute_id: dispute }))
        .status,
    ).toBe(200);
    expect(db.rpc).toHaveBeenLastCalledWith("confirm_resolution", {
      p_dispute: dispute,
    });
  });
  it("validates whole-minute shifts before calling any write RPC", async () => {
    const { id: _id, confirmed: _confirmed, ...input } = db.tables.shifts[0];
    expect(
      (
        await authenticated("/shifts").send({
          ...input,
          starts_at: "2026-10-26T08:00:01+05:30",
        })
      ).status,
    ).toBe(400);
    expect(db.rpc).not.toHaveBeenCalled();
  });
});

describe("anonymous safety API boundary (isolated adapter)", () => {
  it("returns unpredictable credentials while persisting only their hash without identity", async () => {
    const body = {
      organization_id: org,
      category: "equipment",
      description: "The scaffold guardrail requires inspection.",
      priority: "high",
    };
    const first = await request(app).post("/api/safety").send(body);
    const second = await request(app).post("/api/safety").send(body);
    expect(first.status).toBe(201);
    expect(first.body.reference).toMatch(/^FS-[A-F0-9]{16}$/);
    expect(first.body.token).toMatch(/^[a-f0-9]{64}$/);
    expect(second.body.token).not.toBe(first.body.token);
    const [name, args] = db.rpc.mock.calls[0];
    expect(name).toBe("submit_safety");
    expect(args).toEqual({
      p_org: org,
      p_reference: first.body.reference,
      p_token_hash: createHash("sha256").update(first.body.token).digest("hex"),
      p_category: "equipment",
      p_description: body.description,
      p_priority: "high",
    });
    expect(JSON.stringify(args)).not.toContain(first.body.token);
    expect(db.getUser).not.toHaveBeenCalled();
  });
  it("hashes tracking credentials and preserves unrecognized-credential responses", async () => {
    db.rpc.mockResolvedValue({ data: null, error: null });
    const token = "a".repeat(64);
    const response = await request(app)
      .post("/api/safety/track")
      .send({ reference: "FS-0123456789ABCDEF", token });
    expect(response.status).toBe(404);
    expect(db.rpc).toHaveBeenCalledWith("track_safety", {
      p_reference: "FS-0123456789ABCDEF",
      p_token_hash: createHash("sha256").update(token).digest("hex"),
    });
    expect(response.text).not.toContain(token);
  });
  it("returns authorized tracking results without requiring an account", async () => {
    db.rpc.mockResolvedValue({
      data: {
        reference: "FS-0123456789ABCDEF",
        status: "acknowledged",
        events: [],
      },
      error: null,
    });
    const response = await request(app)
      .post("/api/safety/track")
      .send({ reference: "FS-0123456789ABCDEF", token: "a".repeat(64) });
    expect(response.body.status).toBe("acknowledged");
    expect(db.getUser).not.toHaveBeenCalled();
  });
  it("validates and forwards administrator safety updates", async () => {
    const response = await authenticated("/safety/update").send({
      report_id: dispute,
      status: "acknowledged",
      note: "Supervisor assigned an inspection.",
    });
    expect(response.status).toBe(200);
    expect(db.rpc).toHaveBeenCalledWith("update_safety", {
      p_report: dispute,
      p_status: "acknowledged",
      p_note: "Supervisor assigned an inspection.",
    });
  });
});
