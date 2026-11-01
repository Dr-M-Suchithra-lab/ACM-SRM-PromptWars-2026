/** SELECT-only hosted regression checks. No business RPCs, DDL or DML. */
import "dotenv/config";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const {
  SUPABASE_URL: url,
  SUPABASE_PUBLISHABLE_KEY: key,
  DEMO_PASSWORD: password,
} = process.env;
assert.ok(
  url && key && password,
  "Configure the existing synthetic project credentials in the ignored .env file",
);
const client = () =>
  createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
async function login(email: string) {
  const c = client();
  const { error } = await c.auth.signInWithPassword({
    email,
    password: password!,
  });
  assert.ok(!error, "Synthetic account login failed");
  return c;
}
const [worker, admin, hospitalWorker, hospitalAdmin] = await Promise.all(
  [
    "construction.worker",
    "construction.admin",
    "healthcare.worker",
    "healthcare.admin",
  ].map((name) => login(`${name}@demo.fairshift.example`)),
);
const build = "10000000-0000-4000-8000-000000000001";
const hospital = "10000000-0000-4000-8000-000000000002";
const shift = "30000000-0000-4000-8000-000000000001";
let passed = 0;
function check(condition: boolean, label: string) {
  assert.ok(condition, label);
  passed++;
  console.log(`PASS ${label}`);
}
const own = await worker.from("shifts").select("id").eq("id", shift);
check(!own.error && own.data.length === 1, "worker reads own shift");
const tenant = await admin
  .from("shifts")
  .select("id")
  .eq("organization_id", build);
check(!tenant.error && tenant.data.length > 0, "admin reads own organization");
for (const [c, label, org] of [
  [worker, "construction worker", hospital],
  [hospitalWorker, "hospital worker", build],
  [hospitalAdmin, "hospital admin", build],
] as const) {
  const result = await c.from("shifts").select("id").eq("organization_id", org);
  check(
    !result.error && result.data.length === 0,
    `${label} cannot read another organization's shifts`,
  );
}
const unauthorized = await client().from("shifts").select("id");
check(!!unauthorized.error, "unauthenticated table access denied");
const anonymous = await worker.from("safety_reports").select("id");
check(
  !anonymous.error && anonymous.data.length === 0,
  "worker cannot enumerate anonymous concerns",
);
const foreignSafety = await hospitalAdmin
  .from("safety_reports")
  .select("id")
  .eq("organization_id", build);
check(
  !foreignSafety.error && foreignSafety.data.length === 0,
  "admin cannot read another tenant's safety cases",
);
const hashes = await worker
  .schema("private")
  .from("safety_credentials")
  .select("*");
check(!!hashes.error, "anonymous credential hashes are not exposed");
const foreignDisputes = await hospitalAdmin
  .from("pay_disputes")
  .select("id")
  .eq("organization_id", build);
check(
  !foreignDisputes.error && foreignDisputes.data.length === 0,
  "cross-tenant disputes denied",
);
const foreignPolicy = await hospitalAdmin
  .from("pay_policies")
  .select("organization_id")
  .eq("organization_id", build);
check(
  !foreignPolicy.error && foreignPolicy.data.length === 0,
  "cross-tenant policies denied",
);
console.log(
  `${passed} SELECT-only RLS assertions passed. No business records modified.`,
);
