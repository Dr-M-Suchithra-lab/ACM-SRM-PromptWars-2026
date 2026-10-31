# NYAVERIS AI — final integration and production readiness

Latest screenshot/routing/branding repair: [SCREENSHOT_REPAIRS_2026-11-01.md](SCREENSHOT_REPAIRS_2026-11-01.md). Earlier failure/publication statements below are historical.
Latest functional evidence: [FUNCTIONAL_REPAIR_2026-11-01.md](FUNCTIONAL_REPAIR_2026-11-01.md). The backend ESM hotfix is deployed; subsequent contextual assistant/RestGuard repairs retain disabled SaaS/Google flags. Gemini's missing production key and model are confirmed. Historical route failures and publication blockers below must not be mistaken for the latest deployment result; final handoff records live verification.

Latest evidence: [EXECUTION_2026-11-01.md](EXECUTION_2026-11-01.md). Historical results below do not supersede current live browser failures. Publication and deployment are authorized subject to the latest request's prerequisites; GitHub access and verified backup conditions remain blocked.

Prepared 31 October 2026. **Overall status: BLOCKED for production acceptance; local implementation and regression tests PASS.** No migration, provider change, production environment edit, email send, deployment, commit, push, PR, branch creation/deletion/reset or user reset was performed.

Continuation: [CONTINUATION_STATUS.md](CONTINUATION_STATUS.md) records the latest executed checks and subsequently recovered conditional A/B/C approvals plus Git publication authorization. Approval requests below are historical; do not ask for the same approvals again. Their backup and private-configuration prerequisites still apply.

## Completed safe preparation

The existing authentication, business onboarding, employee management and workforce APIs were retained. The connected local journey uses the actual React build, Express handlers, migration SQL, PostgreSQL RLS/transactions and synthetic identities. Supabase Auth's browser SDK runs against a test-only Auth adapter. Real email delivery and successful Google consent are deliberately not inferred from it.

This follow-up adds language-aware device voice selection, Stop speech, completion/failure feedback, delayed voice-list handling, unavailable-voice guidance and cleanup on assistant closure/content changes. It does not redesign the interface or add a paid speech API. Both login and signup Google buttons now have executed OAuth handoff assertions. A non-destructive public capability checker and a seeded-database upgrade/rollback rehearsal were added.

## Current hosted findings

See [PRODUCTION_CAPABILITIES.json](PRODUCTION_CAPABILITIES.json) for sanitized current public observations. Its checker performs GETs only and never authenticates, creates a user, sends mail or modifies records.

- Deployed Supabase project matches `vkkjuopfidvfhzsqzius`.
- Email authentication and signup are enabled; automatic email confirmation is disabled. Real verification/recovery delivery, SMTP credentials, sender configuration, Site URL and redirect allowlist are **unverified**, not assumed absent.
- Google provider is disabled. The deployed Google feature flag is false. The code integration is prepared; no actual Google sign-in has succeeded in this verification.
- The deployed SaaS flag is false, and hosted SaaS schema/RPC are absent. This prevents claiming real new-business registration works in production.
- `/`, `/login`, `/app/home`, `/api/health` return 200. That alone does not prove authentication or authorized page behavior.
- **FAIL in current deployment:** `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`, `/auth/callback`, `/invite`, `/onboarding`, `/terms`, `/privacy` return 404. The reviewed local Vercel configuration already rewrites all nine to the SPA and has regression tests. Deployment approval is required to publish that fix.
- CSP, no-sniff, frame denial, referrer policy, permissions policy and HSTS headers were present on all 13 checked responses. Their presence is not a complete XSS/security audit.
- Local invitation provider key and sender are missing. Production secret environment values were not inspected; their absence cannot be established from local files. No delivery claim is made.
- Existing hosted counts observed: 2 demo organizations, 4 memberships, 18 shifts, 14 payroll entries, 13 disputes, 116 dispute events, 10 safety reports and 25 safety-case events. No existing business row was written by this task.
- Supabase advisors still report leaked-password protection disabled, plus three intentional private RLS-without-policy denials. The optional performance migration remains pending. [Password protection guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Required external configuration — approval B

### Google through existing Supabase Auth

1. Use an existing authorized Google Cloud project. Configure Google Auth Platform branding as **NYAVERIS AI**, operator contact details, audience and approved test users while in testing. Complete any publication/verification required for the chosen audience. Use minimum identity scopes `openid`, `email`, `profile`.
2. Create/reuse a **Web application** OAuth client. Authorized JavaScript origin: `https://nyaveris-ai.vercel.app`. Add `http://localhost:8080` only to the intended development client when needed; a separate development client avoids leaving development origins on the production client.
3. Google authorized redirect URI: **`https://vkkjuopfidvfhzsqzius.supabase.co/auth/v1/callback`**. This is Google's return to Supabase, not the React callback.
4. Store the actual client ID and client secret privately in Supabase Authentication → Sign In / Providers → Google; enable Google only after approval. No Google client secret belongs in Vite, Git, `.env.example` or an invitation link. The client credentials are not supplied and have not been invented.
5. Supabase Site URL: `https://nyaveris-ai.vercel.app`. Configure only approved callback URLs, including the actual request variants:

```text
https://nyaveris-ai.vercel.app/auth/callback
https://nyaveris-ai.vercel.app/auth/callback?next=%2Fapp%2Fhome
https://nyaveris-ai.vercel.app/auth/callback?next=%2Finvite
https://nyaveris-ai.vercel.app/auth/callback?next=/reset-password
```

For local development, add the corresponding `http://localhost:8080/auth/callback` variants only when that origin is used. The browser test origin `http://127.0.0.1:8188` uses an isolated Auth adapter and does not require a production Supabase redirect entry. Do not allow arbitrary Vercel previews/untrusted hosts. Check Supabase's literal/query matching against the exact generated `redirect_to`; do not broadly allow arbitrary destinations to fix a mismatch.

6. After provider setup and callback deployment, set approved server environment `GOOGLE_AUTH_ENABLED=true` and test real consent/cancellation in a real browser. Login and signup both call `signInWithOAuth`, use PKCE and exchange the callback code. Verified existing membership opens its workspace; a retained verified invitation opens acceptance; no membership opens onboarding. Google identity never grants an admin role by itself. Existing-account identity linking must be verified, not forced by deleting/recreating users.

Sources: [Supabase Google setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-google), [redirect allowlist](https://supabase.com/docs/guides/auth/redirect-urls).

### Auth email and employee invitations are separate

| Setting | Configure privately | Current evidence |
| --- | --- | --- |
| Supabase custom SMTP | Chosen provider's host, port, username, password, sender address/name | Not inspected; real delivery unverified |
| Auth confirmation/recovery templates | NYAVERIS AI branding, default `{{ .ConfirmationURL }}` preserving PKCE/RedirectTo | Requires dashboard review and real inbox test |
| Email verification | Keep enabled; minimum password length at least 12 to match UI | Auto-confirm is currently false; password policy setting otherwise unverified |
| Sender domain | Provider-issued DNS records and sender verification; review SPF/DKIM/DMARC with domain owner | Actual sender domain/permission not supplied; do not invent DNS values |
| Resend invitation API | Restricted send-only API key in Vercel server `RESEND_API_KEY` | Local key absent; production presence unknown |
| Resend sender | Verified `INVITATION_FROM_EMAIL`, e.g. `NYAVERIS AI <invitations@YOUR_VERIFIED_DOMAIN>` (placeholder) | Local sender absent; actual verified domain not supplied |
| Link origin | Server `APP_ORIGIN=https://nyaveris-ai.vercel.app` | Must be checked in private Vercel environment before enabling SaaS |
| Delivery acceptance | Operator-provided owner/employee test inboxes; provider acceptance, actual inbox receipt and acceptance separately recorded | No real email sent/received in this task |

Supabase SMTP sends verification/reset messages. The existing server-only Resend integration sends organization invitations to new and existing Auth users. Tokens are random, hashed privately, expiring, recipient-bound and single-use; resending rotates the old token and revocation disables it. The link token is a fragment, removed from the address bar and retained in session storage across authentication. Do not add analytics, mail click tracking or error logging that records full invitation URLs.

The UI distinguishes provider acceptance, failure and missing configuration; provider acceptance is not inbox delivery. Manual authorized link sharing remains available if no email provider is configured. No employee password is generated for an employer. Preserve existing confirmed accounts.

Required real acceptance: owner creates one invitation to the approved employee test inbox, provider accepts it, employee receives it, opens it in a browser with correct Auth context, verifies email or signs into the existing account, accepts once and enters the intended worker dashboard. Then test expiry/revoke/replay and a second unrelated business. Do not send a real invitation to an unapproved recipient.

Sources: [Supabase production SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Auth templates](https://supabase.com/docs/guides/auth/auth-email-templates), [Resend send API](https://resend.com/docs/api-reference/emails/send-email).

## Deployment candidate — approval C

The candidate keeps Vite frontend `dist`, Vercel Node handler `api/[...path].ts`, the existing Express APIs and portable container. `npm run build` typechecks, builds frontend assets and the portable Node bundle. `vercel.json` retains region `bom1`, the 30-second function limit, protected route/API routing and security headers; it adds the nine exact public SPA rewrites already prepared by the functional audit.

Before an approved deployment, verify the existing Vercel project binding owns `nyaveris-ai.vercel.app`; never create a new project or change its Git integration/root settings as a shortcut. Deploy the reviewed submission application directory to that existing project only. Approval C **does not authorize a commit, push, PR, organizer-main edit or application-main edit**. The local repository origin is the separate application repository; do not push its history directly to the organizer.

Review these server variables privately. Do not print secret values or copy production `.env` files:

| Variable | Required operation |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Preserve existing correct project connection; browser receives only publishable config |
| `ENABLE_SAAS` | Enable only after approval A is applied and postflight passes |
| `APP_ORIGIN` | Exact production origin, no incoming Host header or arbitrary path |
| `GOOGLE_AUTH_ENABLED` | Enable only as part of approved B/C rollout with configured provider |
| `RESEND_API_KEY`, `INVITATION_FROM_EMAIL` | Approved B secrets/sender; never `VITE_` variables |
| `SAFETY_GATEWAY_EMAIL`, `SAFETY_GATEWAY_PASSWORD`, `RATE_LIMIT_SALT` | Preserve existing least-privilege gateway/rate settings; never reset the account |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Preserve working configuration; deterministic fallback remains available; real generation not newly verified |
| Existing demo settings | Preserve demonstration organizations/accounts and access configuration; do not reseed |

No service-role key is required by runtime business operations. Supabase holds Auth passwords and Google client secrets. Runtime business data stays in Supabase; no serverless local persistence or process-local rate limiter was introduced. Test fixtures/PGlite are not production imports. Vercel environment values and deployment access are currently unverified private prerequisites.

After C: verify all nine public routes return the new SPA, API health/config matches the authorized project, CSP/callbacks/invitation fragments behave correctly, cross-tenant reads/writes are denied, and the complete hosted acceptance matrix passes before declaring release success. A Vercel-only release still does not satisfy the original event's separate Cloud Run requirement; no Google Cloud infrastructure was configured.

Reference: [Vite SPA routing on Vercel](https://vercel.com/docs/frameworks/frontend/vite).

## Executed workflow matrix

| Requested workflow | Local result | Real hosted result |
| --- | --- | --- |
| 1. Email signup | PASS through actual Auth SDK + isolated Auth adapter | BLOCKED real inbox and unpublished route |
| 2. Email login/session/logout/reset | PASS local; existing hosted synthetic logins verified in prior audit | BLOCKED new-user verification/recovery delivery |
| 3. Google OAuth callback | PASS login + signup PKCE handoff, callback/error regressions; provider not contacted | BLOCKED Google disabled, callback route 404 |
| 4–5. Onboarding/business creation | PASS real API/SQL transaction, duplicate prevention and refresh | BLOCKED schema and deployment |
| 6. Employer dashboard | PASS own new empty business and real computed records | BLOCKED new-business hosted acceptance |
| 7–10. Invitations, employee registration/login/dashboard | PASS new/existing identities, intended recipient, revoke/rotation/replay, worker dashboard | BLOCKED schema, email configuration/delivery and deployment |
| 11. Role-based access | PASS backend/RLS, owner/delegated-admin/worker and tenant separation | Prior hosted RLS probes PASS; new SaaS permissions pending migration |
| 12. Employee management | PASS add/search/filter/edit/rates/department/status, deactivate/reactivate/history | BLOCKED new schema/deployment |
| 13. Shift creation/edit/confirm | PASS actual SQL/UI refresh and retained cancelled/verified records | New-business acceptance BLOCKED |
| 14. Payroll | PASS expected/recorded integer paise, saved policy snapshots/history | New-business acceptance BLOCKED |
| 15. Fairness Twin | PASS deterministic calculation/replay | Existing hosted read-only evidence in functional audit; new-business acceptance BLOCKED |
| 16. ProofLoop | PASS dispute/reopen/respond/confirm and actual events | New-business acceptance BLOCKED |
| 17. SafeSignal | PASS anonymous hash/tracking, case progression/privacy | Existing hosted read-only/RLS evidence in functional audit; new-business acceptance BLOCKED |
| 18. RestGuard | PASS preview versus confirmed save, policies/history | New-business acceptance BLOCKED |
| 19. Saarthi AI | PASS multilingual fallback and controls | Real Gemini generation not newly verified; prior hosted results were fallback |
| 20. Mobile/tablet/desktop | PASS requested 375×812, 768×1024, 1440×900 route/layout checks | Physical devices/audible voice pending |

Test results for this follow-up:

- TypeScript and production build: **PASS**; only existing third-party Zod annotation warnings.
- Vitest: **151 tests PASS, 11 files; 0 final failures** (145 preserved + 6 voice tests).
- SQL/RLS workflow: **53 assertions PASS** with optional performance SQL included; **53 PASS** without it.
- Seeded upgrade/rollback: **47 assertions PASS**, 15 existing tables preserved, forced failure rolled back, no hosted requests.
- Complete Playwright: **34 PASS, 0 FAIL, 1.4 minutes; voice dialog Axe checks PASS** (all 27 previous cases retained, 6 device-control cases plus signup OAuth handoff added). Browser/keyboard/accessibility checks use Chrome and isolated data; no real Google/mail/device-audio claim.
- Secret/bundle scan: **PASS — 126 included files plus 7 browser assets; configured secret values and credential signatures absent**.
- The first unit collection attempt hit a Windows sandbox temporary-cache rename error and executed zero assertions. It was rerun with submission-local TEMP/TMP and scoped loopback permission; all 151 then passed. No test was skipped or weakened to resolve that infrastructure error.
- Public production inspection: four checked URLs return 200, nine account/onboarding URLs FAIL with 404; **release BLOCKED**. No production write was performed.
- Earlier dependency audit reported zero advisories; no application dependency or lockfile changed in this follow-up.

Full prior endpoint/control/RLS evidence remains in [FUNCTIONAL_AUDIT.md](FUNCTIONAL_AUDIT.md). Current provider/route evidence is [PRODUCTION_CAPABILITIES.json](PRODUCTION_CAPABILITIES.json). Migration operations, risks and rollback are detailed in [MIGRATION_REVIEW.md](MIGRATION_REVIEW.md). [VOICE_DEVICE_CHECKLIST.md](VOICE_DEVICE_CHECKLIST.md) is pending real Windows, Android Chrome and iPhone Safari checks.

## Files and workspace scope

All source, test and documentation edits in this follow-up stay inside `students/192425004-AFTAN-FAIZ/` on local branch `192425004-AFTAN-FAIZ`. Existing unrelated changes remain untouched. The local origin still names the separate application repository; no remote Git state was changed or claimed reverified.

Modified: `src/App.tsx`, `tests/e2e/saas.spec.ts`, `scripts/test-saas-database.mjs` (optional performance exclusion only). Added: `src/components/ReadAloud.tsx`, `src/lib/speech.ts`, `tests/speech.test.ts`, `tests/e2e/voice.spec.ts`, `tests/migration-upgrade.mjs`, `scripts/production-readiness.mjs`, this report and its migration/device/capability artifacts. Manifest and rollout links are updated; genuine voice error-state screenshots are captured with a clearly synthetic device API: [desktop](../screenshots/production-readiness/audit-voice-error-desktop.png) and [mobile](../screenshots/production-readiness/audit-voice-error-mobile.png). Full-page captures include content below the fixed modal viewport; they do not prove audible output.

The current attachment explicitly forbids writes outside this folder. Accordingly the root application copy was not edited in this follow-up. The required synchronization check detects seven shared-file differences out of 79 reviewed paths, plus the separately maintained database-test script difference. Local mirroring remains pending a scope exception; no differences were silently overwritten. These are your application copies, not another student's work.

## Separate approval checkpoint

**A — Database:** apply only the SHA-256-matched SaaS migration to project `vkkjuopfidvfhzsqzius` after backup/preflight confirmation, then read-only postflight/advisors. Risks: brief locks, stricter active-membership enforcement and new future snapshot/shift behavior. Rollback retains data; no reset/seed/drop. Optional performance SQL excluded.

**B — Authentication/email:** configure the user-selected Google Web client and secrets in Supabase, Site URL/exact callbacks, approved SMTP/templates/sender settings, and approved Resend key/from/origin in existing Vercel secret configuration. Send one invitation only to a user-approved test inbox and verify actual receipt/acceptance. Risks: misconfigured callbacks can interrupt sign-in; mail/provider settings can fail delivery or incur provider usage. Client credentials, verified sender domain and test inbox are still needed privately. No DNS change, new project or paid provider purchase is included without its own concrete review.

**C — Vercel deployment:** deploy this reviewed candidate from the submission directory to the existing application, after A and required B settings, using the existing project binding. This publishes the prepared SaaS/voice code and nine SPA rewrites; approved flag activation exposes new-user flows. Risks: live application behavior changes and rollback may require restoring the previous deployment/flags. No Git commit/push, branch edit, PR or project-setting change included.

Approve scopes independently. None is authorized by the preparation request itself. If mirroring is desired before release, explicitly permit the listed shared-file changes and database-test script in the root copy as a separate scope exception. Production readiness remains BLOCKED until required approvals/configuration and genuine hosted acceptance are complete.
