# NYAVERIS AI — SaaS rollout and migration review

Current evidence: [EXECUTION_2026-11-01.md](EXECUTION_2026-11-01.md). Invitation email now includes the RLS-authorized business identity and intended recipient. No migration/deployment occurred. Authenticated backup inspection confirms no scheduled backups included on Free plan; verify an external restorable backup/recovery procedure before executing conditional approval A.

Status: local implementation, not deployed. Hosted project: `vkkjuopfidvfhzsqzius`.
No hosted schema, Auth provider, SMTP, Vercel setting or existing record was changed.

## Proposed database change — approval required

Review `supabase/migrations/20261031042154_workforce_saas.sql` before applying it once to the existing project. This migration is independent of the earlier, still-pending performance migration. Do not replay the original foundation migrations: hosted migration timestamps differ from the local foundation filenames.

The change adds `active` to existing memberships (default true) and `cancelled_at` to shifts. It retains `admin`/`worker` role values. A protected `business_settings.owner_user_id` distinguishes an owner from a delegated administrator. It adds user profiles, employee profiles, organization invitations, business audit events and private invitation hashes. Departments and work locations are configurable arrays in the business settings record. It expands the sector constraint to allow a generic profile alongside the unchanged construction and healthcare profiles.

All new application tables have RLS. Authenticated application roles have SELECT access under membership policies, and no direct write access. The private invitation credential table has no application-role table privileges. The public `saas_action` wrapper is SECURITY INVOKER; its private transactional implementation has a fixed empty search path, explicit authenticated/verified-email checks and operation-specific permissions. PUBLIC and anon execution are revoked. No user metadata is used for permissions. Existing protected RPCs remain in use.

Business creation takes an owner-scoped UUID request key and transaction advisory lock. The organization, owner membership, initial configuration and pay policy commit together. Verified accounts can discover only their own pending invitation summaries; acceptance still requires the private link. Invitation acceptance locks the invitation, verifies confirmed Auth email, expiration, pending status and active employee profile, then creates a worker membership and marks acceptance in the same transaction. Duplicate acceptance fails. Resending rotates the hash, revocation disables acceptance, and editing an unlinked recipient email revokes its pending invitations.

Shift edits retain confirmation/payroll protection and support employee reassignment. Cancellation retains the row and appends a ProofLoop event. The shift calendar displays only the selected workspace’s saved shifts using its time zone. The dashboard checklist records review only when an administrator explicitly acknowledges the workforce dashboard, with an idempotent audit event. Employee rates are frozen in policy snapshots on confirmation or first payroll. Saved payroll and dispute history remain reproducible. Deactivation changes protected membership access without deleting history. Owner changes, employee changes and invitations append business audit events; application roles cannot mutate those events.

### Application procedure after explicit approval

1. Confirm project ID and hosted migration history; take an operator-controlled backup/snapshot and record baseline synthetic organization/member/shift/payroll counts. Inspect active long transactions first.
2. Apply **only** the reviewed SaaS migration as a single transaction with the supplied short lock timeout. If a lock or validation fails, roll back the whole transaction. Do not reset, reseed, or create another project.
3. Run security/performance advisors and inspect function grants/RLS. Validate legacy demo access, unchanged snapshots and the active-membership default.
4. With separate authorization, configure the application environment and Auth/email settings below. Do not deploy against the old schema with `ENABLE_SAAS=true`.
5. Run the owner-to-employee acceptance journey with isolated synthetic businesses and actual test inboxes. Confirm both organizations cannot read or mutate one another’s records, and capture no credentials in traces/screenshots.

Rollback: turn off `ENABLE_SAAS` and redeploy only with authorization. Retain new tables and records for investigation. Do not drop tables, delete users or reverse the migration by deleting business data. Database function rollback, if needed, must be separately reviewed because active-access and snapshot guards affect existing RPCs.

## Authentication and Google configuration

Read-only Auth settings audit on 31 October 2026: email enabled, signup allowed, email auto-confirm disabled, Google disabled. SMTP delivery and allowed redirect settings could not be established from these public capability flags. Do not claim email verification, reset delivery or Google login is live-verified.

Use Supabase Auth for signup/passwords, verification, recovery, Google and logout. The browser uses PKCE. Callback continuation is limited to `/app/home`, `/onboarding`, `/invite` and `/reset-password`. Invitation secrets arrive in a URL fragment, which is immediately removed from the address bar and retained only in session storage across authentication; acceptance/logout clears it. They are never included in callback query parameters, API paths or AI requests. Session credentials use Supabase browser storage; “Remember my session” chooses local storage versus tab session storage. This is a browser SPA, so protect against XSS and use a trusted browser.

In the existing Supabase project dashboard:

- Keep email confirmations enabled and set an Auth password minimum of at least 12 characters to match the application guidance. Set Site URL to `https://nyaveris-ai.vercel.app`.
- Allow the exact production callback `https://nyaveris-ai.vercel.app/auth/callback` and callback variants with `?next=/app/home`, `?next=/reset-password`, and the encoded `?next=%2Fapp%2Fhome` / `?next=%2Finvite` variants used by the application. Supabase redirect matching may require a narrowly scoped `/auth/callback**` rule for the query string; do not allow arbitrary production paths or untrusted origins.
- Allow the same callback on `http://localhost:8080` for normal local development and `http://127.0.0.1:8188` only for authorized local integration checks. Match the actual port; Vite-only port 5173 needs its API proxy or the integrated server.
- Use the default Supabase confirmation/recovery link templates (`{{ .ConfirmationURL }}`); preserve PKCE code delivery and RedirectTo. Check branding and provider link-tracking settings. Test that the email link returns to the callback, not directly to a page expecting an established session. PKCE links must open in the browser where the request began; otherwise request a fresh link there.
- Configure custom production SMTP with a verified sender/domain, SPF/DKIM/DMARC and provider-specific host, port, username and password in Supabase Dashboard only. Confirm Auth rate limits and deliverability with test inboxes. Default restricted email delivery is not a production email setup.

For Google, use an existing authorized Google Cloud project; no project was created by this task. Configure Google Auth Platform branding as NYAVERIS AI, audience/test users or production publication, and the minimum `openid`, `email`, `profile` scopes. Create a Web application OAuth client. Authorized JavaScript origins are the production origin and the explicitly used localhost origin. The Google **authorized redirect URI** is `https://vkkjuopfidvfhzsqzius.supabase.co/auth/v1/callback` (the Supabase provider callback, not the React route). Put the client ID and client secret in Supabase Authentication → Sign In / Providers → Google, enable the provider, and verify the complete flow. Only then set `GOOGLE_AUTH_ENABLED=true` in the application. The disabled button currently explains the missing provider configuration. Follow [Supabase Google setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-google), [redirect guidance](https://supabase.com/docs/guides/auth/redirect-urls) and [SMTP guidance](https://supabase.com/docs/guides/auth/auth-smtp).

## Invitation delivery and application configuration

New placeholders are in `.env.example`. Never copy a private `.env` into a submission or commit.

- `ENABLE_SAAS=false` until the migration and rollout are approved. Existing demo functionality works with this flag off.
- `APP_ORIGIN=https://nyaveris-ai.vercel.app` in production; exact trusted origin only, with no trailing slash. Local example: `http://localhost:8080`. Invitation links never use an incoming Host header.
- `GOOGLE_AUTH_ENABLED=false` until provider verification.
- `RESEND_API_KEY` and `INVITATION_FROM_EMAIL` are optional server-only invitation delivery settings. Configure a verified Resend sender/domain and restricted API key through approved secret management. Never prefix them with `VITE_`.

Supabase SMTP sends Auth messages. Resend sends application organization invitations, including to existing confirmed users. No employer-generated password or Auth admin secret is used. If Resend is absent/fails, the pending invitation and secure link remain available for the administrator to share manually. A successful API response is reported as **provider accepted**, never guaranteed delivery. Existing invitation rows do not expose raw links; an administrator can rotate/resend to obtain a fresh private link. Manual sharing is not an automatic email-delivery claim. See [Resend’s send-email API](https://resend.com/docs/api-reference/emails/send-email).

Review the actual `/terms` and `/privacy` documents and supply any organization-specific legal/contact/retention requirements before release. These are functioning linked documents, not external placeholder URLs. Currency is intentionally INR: the existing deterministic engine uses integer paise. Other currencies are not silently represented as rupees.

## Local verification

From this application directory:

```powershell
npm ci
npm run typecheck
npm test
$env:NODE_ENV='production'
npm run build
```

The optional SQL test runtime is isolated from application dependencies and production persistence:

```powershell
npm install --prefix .local/saas-db --no-audit --no-fund --ignore-scripts @electric-sql/pglite@0.3.14
node scripts/test-saas-database.mjs
```

That script runs all migrations against an ephemeral PostgreSQL WASM instance with synthetic Auth identities and real RLS/functions/transactions. It does not read `.env` or call the hosted project. Its Auth stub does **not** verify real email or Google. Browser SaaS tests use isolated Auth/API adapters; existing demo browser tests use the authorized synthetic accounts without resetting their records. No production account signup or invitation email was sent during these checks.

The API reads pages of authorized records instead of silently counting only 500 rows. A 10,000-record safety window fails explicitly rather than publishing partial totals. Large deployments need reporting-period pagination before exceeding that window. Employee histories retain existing payroll and review records. Owners delegate the existing full workplace-admin scope; granular department-specific administrator scopes and ownership transfers are not provided.

## Release acceptance still requiring hosted approval/configuration

Run real email signup → verification callback → owner creation → employee invitation → real inbox receipt → existing/new verified employee acceptance → shift → hours confirmation → payroll → dispute → ProofLoop, then the same journey for a second isolated business. Exercise Google cancellation and successful Google login, password reset email, expired/revoked/replayed invitations, cross-tenant direct API/RLS requests, and mobile/desktop accessibility. Local passing tests do not replace this hosted acceptance step. No live SaaS readiness claim is made before it passes.

## Final readiness follow-up

See [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md) for the current public deployment findings, separate A/B/C approval scopes and final regression results; [MIGRATION_REVIEW.md](MIGRATION_REVIEW.md) includes the exact SQL hash, hosted comparison, data-preservation rehearsal and rollback plan. Audible acceptance remains pending in [VOICE_DEVICE_CHECKLIST.md](VOICE_DEVICE_CHECKLIST.md). No production operation is authorized or completed by these documents.
