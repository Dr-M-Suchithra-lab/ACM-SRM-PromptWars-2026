import "dotenv/config";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
const url = process.env.SUPABASE_URL!,
  key = process.env.SUPABASE_PUBLISHABLE_KEY!;
const client = () =>
  createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
let passed = 0;
function check(condition: unknown, name: string) {
  assert.ok(condition, name);
  passed++;
  console.log(`PASS ${name}`);
}
async function signIn(name: string, password = process.env.DEMO_PASSWORD!) {
  const c = client();
  const { data, error } = await c.auth.signInWithPassword({
    email: `${name}@demo.fairshift.example`,
    password,
  });
  assert.ifError(error);
  assert.ok(data.user);
  return c;
}
const worker = await signIn("construction.worker"),
  admin = await signIn("construction.admin"),
  hospital = await signIn("healthcare.admin"),
  otherWorker = await signIn("healthcare.worker"),
  gateway = await signIn(
    "safety.gateway",
    process.env.SAFETY_GATEWAY_PASSWORD!,
  );
const build = "10000000-0000-4000-8000-000000000001",
  health = "10000000-0000-4000-8000-000000000002";
const s = "30000000-0000-4000-8000-000000000001";
check(
  (await worker.from("shifts").select("*").eq("id", s)).data?.length === 1,
  "worker can read own shift",
);
check(
  (await admin.from("shifts").select("*").eq("organization_id", build)).data!
    .length > 0,
  "admin can read own organization",
);
check(
  (await worker.from("shifts").select("*").eq("organization_id", health)).data
    ?.length === 0,
  "worker denied other organization shifts",
);
check(
  (await otherWorker.from("shifts").select("*").eq("id", s)).data?.length === 0,
  "unrelated worker denied construction shift",
);
check(
  (await hospital.from("shifts").select("*").eq("id", s)).data?.length === 0,
  "hospital admin denied construction shift",
);
check(
  (await hospital.from("pay_disputes").select("*").eq("organization_id", build))
    .data?.length === 0,
  "cross-tenant dispute read denied",
);
check(
  !!(await client().from("shifts").select("*")).error,
  "unauthenticated table access denied",
);
check(
  !!(
    await worker
      .from("pay_policies")
      .update({ hourly_paise: 1 })
      .eq("organization_id", build)
  ).error,
  "worker cannot directly alter pay policies",
);
check(
  !!(
    await admin
      .from("pay_policies")
      .update({ hourly_paise: 1 })
      .eq("organization_id", health)
  ).error,
  "admin cannot directly alter another tenant policy",
);
check(
  !!(
    await worker.rpc("save_policy", {
      p_org: build,
      p_hourly: 1,
      p_regular: 480,
      p_ot: 15000,
      p_rest: 660,
      p_max: 720,
      p_days: 6,
      p_timezone: "Asia/Kolkata",
    })
  ).error,
  "worker policy RPC denied",
);
check(
  !!(await hospital.rpc("confirm_shift", { p_shift: s })).error,
  "admin cannot confirm another worker shift",
);
check(
  !!(
    await hospital.rpc("resolve_review", {
      p_dispute: "40000000-0000-4000-8000-000000000001",
      p_paise: 1,
      p_explanation: "Cross organization correction attempt.",
    })
  ).error,
  "cross-tenant correction RPC denied",
);
check(
  !!(await worker.from("dispute_events").delete().eq("shift_id", s)).error,
  "worker cannot delete ProofLoop events",
);
check(
  !!(
    await admin
      .from("dispute_events")
      .update({ explanation: "Tampered" })
      .eq("shift_id", s)
  ).error,
  "admin cannot overwrite ProofLoop events",
);
check(
  (await worker.from("safety_reports").select("*")).data?.length === 0,
  "workers cannot enumerate anonymous safety cases",
);
check(
  (await gateway.from("shifts").select("*")).data?.length === 0,
  "safety gateway cannot read worker shifts",
);
check(
  (await gateway.from("organization_members").select("*")).data?.length === 0,
  "gateway has no organization permissions",
);
check(
  !!(await worker.schema("private").from("safety_credentials").select("*"))
    .error,
  "private tracking hashes unavailable through Data API",
);
check(
  !!(
    await worker.rpc("track_safety", {
      p_reference: "FS-0000000000000001",
      p_token_hash: "0".repeat(64),
    })
  ).error,
  "worker cannot bypass safety tracking gateway",
);
check(
  !!(
    await client().rpc("request_review", {
      p_shift: s,
      p_reason: "Unauthenticated review should fail.",
    })
  ).error,
  "unauthenticated RPC access denied",
);
check(
  (await admin.from("safety_reports").select("*").eq("organization_id", build))
    .data!.length > 0,
  "admin can review own safety cases",
);
const reports = await hospital
  .from("safety_reports")
  .select("*")
  .eq("organization_id", build);
check(
  reports.data?.length === 0,
  "admin cannot read another tenant safety cases",
);
check(
  !!(
    await admin.rpc("save_shift", {
      p_id: null,
      p_org: build,
      p_worker: "20000000-0000-4000-8000-000000000001",
      p_start: "2026-10-20T08:00:00.400+05:30",
      p_end: "2026-10-20T18:30:00.400+05:30",
      p_break: 30,
      p_location: "Invalid sub-minute boundary QA",
    })
  ).error,
  "direct admin RPC cannot bypass exact whole-minute validation",
);
console.log(`${passed} live Supabase RLS/security assertions passed.`);
