// Isolated PostgreSQL verification. Never connects to Supabase or reads .env.
// Install the pinned optional test runtime in .local/saas-db (see docs/SAAS_ROLLOUT.md).
import { readFileSync, readdirSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import assert from "node:assert/strict";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { PGlite } = await import(
  pathToFileURL(
    resolve(
      root,
      ".local/saas-db/node_modules/@electric-sql/pglite/dist/index.js",
    ),
  ).href
);
const db = new PGlite();
let checks = 0;
const owner = "70000000-0000-4000-8000-000000000001",
  other = "70000000-0000-4000-8000-000000000002",
  worker = "70000000-0000-4000-8000-000000000003",
  stranger = "70000000-0000-4000-8000-000000000004";
const ok = (condition) => {
  assert(condition);
  checks++;
};
const scalar = async (sql, args = []) =>
  Object.values((await db.query(sql, args)).rows[0])[0];
const as = async (user, role = "authenticated") => {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    user ?? "",
  ]);
  await db.exec("set role " + role);
};
const action = (name, org, data) =>
  scalar("select public.saas_action($1,$2,$3::jsonb)", [
    name,
    org,
    JSON.stringify(data),
  ]);
const denied = async (fn) => {
  let failed = false;
  try {
    await fn();
  } catch {
    failed = true;
  }
  ok(failed);
};
try {
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create schema extensions;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`,
  );
  for (const f of readdirSync(resolve(root, "supabase/migrations"))
    .filter((x) => x.endsWith(".sql"))
    .filter(
      (x) =>
        process.env.SAAS_TEST_INCLUDE_PERFORMANCE !== "false" ||
        !x.endsWith("_backend_policy_and_fk_performance.sql"),
    )
    .sort()) {
    let sql = readFileSync(
      resolve(root, "supabase/migrations", f),
      "utf8",
    ).replace(
      /create extension if not exists pgcrypto with schema extensions;/i,
      "",
    );
    // All fixture state exists only in this PostgreSQL instance.
    await db.exec(sql);
  }
  await db.exec("reset statement_timeout;reset lock_timeout;");
  await db.query(
    "insert into auth.users values($1,'owner@example.test',now()),($2,'other@example.test',now()),($3,'worker@example.test',now()),($4,'stranger@example.test',now())",
    [owner, other, worker, stranger],
  );
  await db.exec(
    "insert into public.sector_configurations values('construction','Construction','{}','{}'),('healthcare','Healthcare','{}','{}')",
  );
  const business = {
    request_id: "71000000-0000-4000-8000-000000000001",
    name: "Synthetic Test One",
    industry: "construction",
    email: "owner@example.test",
    phone: "",
    location: "Test site",
    country: "India",
    state: "Test state",
    city: "Test city",
    description: "",
    size: 2,
    working_days: [1, 2, 3, 4, 5],
    currency: "INR",
    policy: {
      basis: "hourly",
      hourly_paise: 10000,
      daily_paise: 80000,
      regular_minutes: 480,
      overtime_bps: 15000,
      min_rest_minutes: 660,
      max_shift_minutes: 720,
      max_consecutive_days: 6,
      timezone: "Asia/Kolkata",
    },
  };
  await as(owner);
  const { organization_id: org } = await action(
    "create_business",
    null,
    business,
  );
  ok(!!org);
  ok((await action("create_business", null, business)).organization_id === org);
  ok((await scalar("select count(*)::int from public.organizations")) === 1);
  ok(
    (await scalar(
      "select role from public.organization_members where user_id=$1",
      [owner],
    )) === "admin",
  );
  await denied(() =>
    action("create_business", null, {
      ...business,
      request_id: "71000000-0000-4000-8000-000000000009",
      policy: { ...business.policy, hourly_paise: -1 },
    }),
  );
  ok((await scalar("select count(*)::int from public.organizations")) === 1); // entire failing transaction rolled back
  await action("review_dashboard", org, {});
  await action("review_dashboard", org, {});
  ok(
    (await scalar(
      "select count(*)::int from public.business_events where organization_id=$1 and event_type='workforce_dashboard_reviewed'",
      [org],
    )) === 1,
  );
  const employee = {
    name: "Synthetic Employee",
    email: "worker@example.test",
    phone: "",
    employee_code: "SYN001",
    department: "Operations",
    job_title: "Worker",
    employment_type: "full_time",
    start_date: "2026-10-31",
    status: "active",
    rate_paise: 12000,
    pay_basis: "hourly",
    work_location: "Test site",
    skills: "",
  };
  const { employee_id: employeeId } = await action(
    "save_employee",
    org,
    employee,
  );
  ok(!!employeeId);
  const tokenHash = "a".repeat(64),
    newHash = "b".repeat(64);
  const { invitation_id: inv } = await action("invite_employee", org, {
    employee_id: employeeId,
    token_hash: tokenHash,
  });
  ok(!!inv);
  await denied(() =>
    scalar("select token_hash from private.invitation_credentials"),
  );
  await as(stranger);
  await denied(() =>
    action("accept_invitation", null, { token_hash: tokenHash }),
  );
  await as(worker);
  ok((await action("my_invitations", null, {})).length === 1);
  ok(
    (await action("preview_invitation", null, { token_hash: tokenHash }))
      .business_name === business.name,
  );
  ok(
    (await action("accept_invitation", null, { token_hash: tokenHash }))
      .organization_id === org,
  );
  await denied(() =>
    action("accept_invitation", null, { token_hash: tokenHash }),
  );
  ok(
    (await scalar(
      "select role from public.organization_members where user_id=$1",
      [worker],
    )) === "worker",
  );
  await denied(() =>
    action("set_admin", org, { user_id: worker, admin: true }),
  );
  await denied(() =>
    action("save_settings", org, { ...business, name: "Forged" }),
  );
  await denied(() =>
    scalar(
      "insert into public.organization_members(organization_id,user_id,role,display_name) values($1,$2,'admin','Forged') returning role",
      [org, stranger],
    ),
  );
  await as(other);
  const { organization_id: org2 } = await action("create_business", null, {
    ...business,
    name: "Synthetic Test Two",
  });
  ok(org2 !== org);
  ok(
    (await scalar(
      "select count(*)::int from public.employee_profiles where organization_id=$1",
      [org],
    )) === 0,
  );
  await denied(() => action("save_employee", org, employee));
  await as(worker);
  ok(
    (await scalar(
      "select count(*)::int from public.organizations where id=$1",
      [org2],
    )) === 0,
  );
  await as(owner);
  const shift = await scalar(
    "select public.save_shift(null,$1,$2,'2026-11-01 09:00Z','2026-11-01 17:00Z',0,'Test site')",
    [org, worker],
  );
  ok(!!shift);
  await as(worker);
  await scalar("select public.confirm_shift($1)", [shift]);
  await as(owner);
  await scalar(
    "select public.record_payroll($1,90000,'Synthetic payroll regression')",
    [shift],
  );
  const snap = await scalar(
    "select policy_snapshot->>'hourly_paise' from public.shifts where id=$1",
    [shift],
  );
  ok(snap === "12000");
  ok(
    (await scalar(
      "select (details->>'expected_paise')::int from public.dispute_events where shift_id=$1 and event_type='fairness_check' order by created_at desc limit 1",
      [shift],
    )) === 96000,
  );
  await action("save_employee", org, {
    ...employee,
    id: employeeId,
    rate_paise: 15000,
  });
  ok(
    (await scalar(
      "select policy_snapshot->>'hourly_paise' from public.shifts where id=$1",
      [shift],
    )) === snap,
  );
  await as(worker);
  const review = await scalar(
    "select public.request_review($1,'Please review the synthetic pay difference')",
    [shift],
  );
  ok(!!review);
  await as(owner);
  await scalar(
    "select public.resolve_review($1,96000,'Correcting synthetic payroll discrepancy')",
    [review],
  );
  await as(worker);
  await scalar("select public.confirm_resolution($1)", [review]);
  ok(
    (await scalar("select status from public.pay_disputes where id=$1", [
      review,
    ])) === "closed",
  );
  await as(owner);
  await action("save_employee", org, {
    ...employee,
    id: employeeId,
    status: "inactive",
  });
  await as(worker);
  ok((await scalar("select count(*)::int from public.shifts")) === 0);
  await denied(() => scalar("select public.confirm_shift($1)", [shift]));
  await as(owner);
  await action("save_employee", org, {
    ...employee,
    id: employeeId,
    status: "active",
  });
  const extra = await action("save_employee", org, {
    ...employee,
    email: "stranger@example.test",
    employee_code: "SYN002",
  });
  const pending = await action("invite_employee", org, {
    employee_id: extra.employee_id,
    token_hash: newHash,
  });
  await action("rotate_invitation", org, {
    invitation_id: pending.invitation_id,
    token_hash: "c".repeat(64),
  });
  await as(stranger);
  await denied(() =>
    action("accept_invitation", null, { token_hash: newHash }),
  );
  await as(owner);
  await action("revoke_invitation", org, {
    invitation_id: pending.invitation_id,
  });
  await as(stranger);
  await denied(() =>
    action("accept_invitation", null, { token_hash: "c".repeat(64) }),
  );
  await as(owner);
  const exp = await action("invite_employee", org, {
    employee_id: extra.employee_id,
    token_hash: "d".repeat(64),
  });
  await db.exec("reset role");
  await db.query(
    "update public.organization_invitations set expires_at=now()-interval '1 second' where id=$1",
    [exp.invitation_id],
  );
  await as(stranger);
  await denied(() =>
    action("accept_invitation", null, { token_hash: "d".repeat(64) }),
  );

  await as(owner);
  const disposable = await scalar(
    "select public.save_shift(null,$1,$2,'2026-11-02 09:00Z','2026-11-02 17:00Z',0,'Test site')",
    [org, worker],
  );
  await action("cancel_shift", org, {
    shift_id: disposable,
    note: "Synthetic cancelled shift verification",
  });
  ok(
    await scalar(
      "select cancelled_at is not null from public.shifts where id=$1",
      [disposable],
    ),
  );
  await as(worker);
  await denied(() => scalar("select public.confirm_shift($1)", [disposable]));
  await as(owner);
  await denied(() =>
    action("cancel_shift", org, {
      shift_id: shift,
      note: "Cannot cancel saved payroll",
    }),
  );
  const unconfirmed = await scalar(
    "select public.save_shift(null,$1,$2,'2026-11-03 09:00Z','2026-11-03 17:00Z',0,'Test site')",
    [org, worker],
  );
  await scalar(
    "select public.record_payroll($1,96000,'Synthetic unconfirmed payroll snapshot')",
    [unconfirmed],
  );
  ok(
    (await scalar(
      "select policy_snapshot->>'hourly_paise' from public.shifts where id=$1",
      [unconfirmed],
    )) === "12000",
  );
  ok(
    (await scalar(
      "select (details->>'expected_paise')::int from public.dispute_events where shift_id=$1 and event_type='fairness_check'",
      [unconfirmed],
    )) === 96000,
  );
  await action("set_admin", org, { user_id: worker, admin: true });
  await as(worker);
  await denied(() =>
    action("save_settings", org, {
      ...business,
      departments: [],
      work_locations: [],
    }),
  );
  await denied(() =>
    action("set_admin", org, { user_id: owner, admin: false }),
  );
  await as(owner);
  await denied(() =>
    action("set_admin", org, { user_id: owner, admin: false }),
  );
  await action("set_admin", org, { user_id: worker, admin: false });
  await action("save_settings", org, {
    ...business,
    name: "Updated Synthetic Business",
    departments: ["Operations"],
    work_locations: ["Test site"],
  });
  ok(
    (await scalar("select name from public.organizations where id=$1", [
      org,
    ])) === "Updated Synthetic Business",
  );
  const before = await scalar(
    "select count(*)::int from public.business_events where organization_id=$1",
    [org],
  );
  await denied(() =>
    scalar("delete from public.business_events where organization_id=$1", [
      org,
    ]),
  );
  ok(
    (await scalar(
      "select count(*)::int from public.business_events where organization_id=$1",
      [org],
    )) === before,
  );
  // Changing an unlinked recipient invalidates its outstanding invitation atomically.
  await action("save_employee", org, {
    ...employee,
    id: extra.employee_id,
    employee_code: "SYN002",
    email: "changed@example.test",
  });
  ok(
    (await scalar(
      "select status from public.organization_invitations where id=$1",
      [exp.invitation_id],
    )) === "revoked",
  );
  await as(other);
  const foreign = await action("save_employee", org2, {
    ...employee,
    email: "stranger@example.test",
    employee_code: "SYN-OTHER",
  });
  await action("invite_employee", org2, {
    employee_id: foreign.employee_id,
    token_hash: "e".repeat(64),
  });
  await db.exec("reset role");
  await db.query("update auth.users set email_confirmed_at=null where id=$1", [
    stranger,
  ]);
  await as(stranger);
  await denied(() =>
    action("accept_invitation", null, { token_hash: "e".repeat(64) }),
  );
  await db.exec("reset role");
  await db.query("update auth.users set email_confirmed_at=now() where id=$1", [
    stranger,
  ]);
  await as(stranger);
  ok(
    (await action("accept_invitation", null, { token_hash: "e".repeat(64) }))
      .organization_id === org2,
  );
  ok(
    (await scalar(
      "select count(*)::int from public.shifts where organization_id=$1",
      [org],
    )) === 0,
  );
  ok(
    (await scalar("select count(*)::int from public.employee_profiles")) === 1,
  );
  await as(worker);
  ok(
    (await scalar("select count(*)::int from public.employee_profiles")) === 1,
  );
  await as(null, "anon");
  await denied(() => scalar("select * from public.employee_profiles"));
  await denied(() => action("create_business", null, business));
  console.log(
    JSON.stringify({
      status: "passed",
      checks,
      engine: "isolated PostgreSQL (PGlite)",
      hostedRequests: 0,
      syntheticOnly: true,
    }),
  );
} catch (e) {
  console.error(
    JSON.stringify({
      status: "failed",
      checks,
      code: e.code,
      message: e.message,
      where: e.where,
    }),
  );
  process.exitCode = 1;
} finally {
  await db.close();
}
