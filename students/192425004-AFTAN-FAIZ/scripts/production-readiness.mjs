// Read-only public capabilities. Never sends email, signs up, changes settings or deploys.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "dotenv";
const env = {
  ...process.env,
  ...(process.env.SUBMISSION_ENV_FILE
    ? parse(readFileSync(process.env.SUBMISSION_ENV_FILE))
    : {}),
};
const project = "https://vkkjuopfidvfhzsqzius.supabase.co";
const origin = "https://nyaveris-ai.vercel.app";
if ((env.SUPABASE_URL || env.VITE_SUPABASE_URL) !== project)
  throw new Error("Readiness check requires the existing authorized project");
const key = env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!key)
  throw new Error(
    "A publishable key is required in the private process environment",
  );
const output = {
  application: "NYAVERIS AI",
  checkedAt: new Date().toISOString(),
  origin,
  project,
  hostedWrites: 0,
  routes: [],
  configuration: {},
};
const headers = [
  "content-security-policy",
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy",
  "permissions-policy",
  "strict-transport-security",
];
for (const path of [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/auth/callback",
  "/invite",
  "/onboarding",
  "/terms",
  "/privacy",
  "/app/home",
  "/api/health",
]) {
  const response = await fetch(origin + path, {
    signal: AbortSignal.timeout(20000),
    redirect: "error",
  });
  output.routes.push({
    path,
    status: response.status,
    contentType: response.headers.get("content-type"),
    securityHeaders: Object.fromEntries(
      headers.map((name) => [name, response.headers.has(name)]),
    ),
  });
}
const settings = await fetch(project + "/auth/v1/settings", {
  headers: { apikey: key },
  signal: AbortSignal.timeout(15000),
});
if (!settings.ok)
  throw new Error("Public authentication capability check failed");
const auth = await settings.json();
const config = await fetch(origin + "/api/config", {
  signal: AbortSignal.timeout(15000),
});
if (!config.ok)
  throw new Error("Public application configuration check failed");
const app = await config.json();
output.configuration = {
  emailEnabled: auth.external?.email === true,
  signupDisabled: auth.disable_signup === true,
  emailAutoConfirm: auth.mailer_autoconfirm === true,
  googleProviderEnabled: auth.external?.google === true,
  deployedGoogleButtonEnabled: app.googleEnabled === true,
  deployedSaasEnabled: app.saasEnabled === true,
  deployedSupabaseProjectMatches: app.url === project,
  localInvitationApiKeyPresent: !!env.RESEND_API_KEY,
  localInvitationSenderPresent: !!env.INVITATION_FROM_EMAIL,
  productionSecretEnvironment:
    "not inspected; public capabilities cannot establish secret values, SMTP, OAuth credentials or sender verification",
};
output.assessment = {
  missingPublicRoutes: output.routes
    .filter((route) => route.status !== 200)
    .map((route) => route.path),
  releaseStatus: "BLOCKED",
  reason:
    "Hosted migration, approved deployment and real OAuth/email/device acceptance remain pending; this script only inspects public capabilities.",
};
mkdirSync(resolve(".local"), { recursive: true });
writeFileSync(
  resolve(".local/production-readiness.json"),
  JSON.stringify(output, null, 2) + "\n",
);
console.log(JSON.stringify(output, null, 2));
