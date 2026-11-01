/** One-time dedicated-project provisioning. No secrets or account passwords are printed. */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
if (!process.env.SUPABASE_SECRET_KEY)
  throw new Error(
    "Provisioning requires a server-only Supabase secret key. Remove it from runtime after provisioning.",
  );
if (!process.env.DEMO_PASSWORD || !process.env.SAFETY_GATEWAY_PASSWORD)
  throw new Error(
    "Set strong random DEMO_PASSWORD and SAFETY_GATEWAY_PASSWORD first.",
  );
const c = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const accounts = [
  ["1", "construction.worker"],
  ["2", "construction.admin"],
  ["3", "healthcare.worker"],
  ["4", "healthcare.admin"],
  ["5", "safety.gateway"],
];
const { data: existing, error: listError } = await c.auth.admin.listUsers({
  perPage: 100,
});
if (listError) throw listError;
for (const [suffix, name] of accounts) {
  const id = "20000000-0000-4000-8000-00000000000" + suffix;
  const email = name + "@demo.fairshift.example";
  if (existing.users.some((u) => u.email === email)) {
    console.log(`Exists: ${name}`);
    continue;
  }
  const { error } = await c.auth.admin.createUser({
    id,
    email,
    password:
      name === "safety.gateway"
        ? process.env.SAFETY_GATEWAY_PASSWORD
        : process.env.DEMO_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  console.log(`Created: ${name}`);
}
console.log(
  "Auth users provisioned. Run supabase/seed.sql and the private gateway enrollment SQL in docs/SETUP.md through an authorized SQL connection.",
);
