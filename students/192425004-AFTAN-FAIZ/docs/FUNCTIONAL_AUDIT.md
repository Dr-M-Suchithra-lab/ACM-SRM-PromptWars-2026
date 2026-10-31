# NYAVERIS AI — Functional audit and repair

Audit date: 31 October 2026 (Asia/Calcutta). Repository target: `Dr-M-Suchithra-lab/ACM-SRM-PromptWars-2026`; branch `192425004-AFTAN-FAIZ`; submission `students/192425004-AFTAN-FAIZ/`.

**Overall release result: BLOCKED.** The repaired local application passes the executed tests. A complete real hosted signup-to-employee acceptance journey cannot be declared successful: the proposed SaaS migration is not installed, Google is disabled, and real inbox delivery/provider configuration has not been verified. No migration, deployment, commit, push, PR, merge, branch operation or production setting change was performed.

## Evidence and test environments

- **Hosted evidence:** existing Supabase project `vkkjuopfidvfhzsqzius`, current deployed application at `https://nyaveris-ai.vercel.app`, SELECT-only RLS probes with existing synthetic worker/admin accounts, current schema/migrations/advisors, public Auth capability flags and persisted rate-limiter checks. No existing business records were reset, overwritten or deleted. The rate test creates one random rate-limit bucket; sign-in tests create ordinary Auth sessions.
- **Connected isolated evidence:** the real built React application, real Express handlers, the actual migration SQL, real PostgreSQL transactions and RLS in ephemeral PGlite, and a test-only Auth adapter. New users register through the actual Supabase browser SDK against that adapter and consume local verification codes. Business APIs and database writes are not replaced with hard-coded success responses. This proves the local application/SQL integration, **not** real Supabase Auth email delivery or Google provider success.
- Existing individual SaaS UI specifications also contain explicitly intercepted Auth/API responses; those tests validate client states only. The added connected journey avoids those API intercepts for business operations. The full browser run includes every existing specification, including the policy and schedule mutation tests, on isolated data. No failing specification was omitted from the final full run.
- The isolated browser harness injects an allow guard to avoid rate-limit interference with UI tests. Persistent rate limiting is tested separately against the hosted PostgreSQL limiter and in unit tests. The Auth adapter, fixture endpoints and PGlite are test code only and are not imported by the production bundle.
- The active local branch was checked before edits and remains correct. Existing uncommitted work was preserved. Reviewed shared repairs are mirrored to the root application copy under the user's earlier synchronization approval. Organizer `main`, other branches and other student folders were not written; this is an action-scope statement, not a claim that all remote branches were inspected.

## Executed result summary

| Check | Result | Evidence/limit |
| --- | --- | --- |
| TypeScript | PASS | `npm run typecheck`; no suppressed errors |
| Unit/API/security tests | PASS — 145 tests, 10 files | `npm test -- --maxWorkers=1` |
| Isolated PostgreSQL SQL/RLS workflow | PASS — 53 assertions | `node scripts/test-saas-database.mjs`; no hosted requests |
| Complete Playwright suite | PASS — 27 tests (1.7 minutes), all existing specifications | `npx vitest run --config tests/functional.config.ts`; real Chrome, isolated connected stack |
| Production build | PASS | `npm run build`, Vite + Node bundle; harmless third-party Zod annotation warnings |
| Deployed read-only verifier | PASS — 42 checks | Existing deployment; all addedQARecords empty; multilingual provider results were fallback |
| Hosted SELECT-only RLS | PASS — 11 assertions | `npm run test:rls:readonly` with private env read in memory |
| Hosted serverless security | PASS — 5 groups | 15 requests allowed/16th denied, independent client sees same persisted limit, worker/private denials |
| Dependency audit | PASS | `npm audit --json`: 0 low/moderate/high/critical advisories at audit time |
| Secret/bundle scan | PASS — 114 included files and 7 browser assets | Known private values and credential signatures; does not constitute a mathematical guarantee |
| Synchronization | PASS — all 74 shared files match | Shared files compared, no credentials/generated output copied |
| Actual Google OAuth success | BLOCKED | Public project settings report Google disabled |
| Actual signup/verification/reset email delivery | BLOCKED | Email enabled, signup enabled, auto-confirm false; SMTP/inbox delivery unverified |
| Actual invitation email delivery | BLOCKED | Local Resend key and verified sender absent; no email-delivery claim made |
| Hosted new-business/employee persistence | BLOCKED | SaaS tables and `saas_action` absent; migration approval still pending |
| Audible speech output | MANUAL/BLOCKED | Browser Read aloud handler clicked without exception; speakers/voice availability not audited |

Raw final logs are retained locally in `.local/functional-isolated-browser.txt`, `.local/backend-live-results.json`, `.local/functional-npm-audit.json`, `.local/functional-auth-capabilities.json`. They are excluded from submission source. Sanitized observed application endpoints are included in [FUNCTIONAL_ENDPOINTS.json](FUNCTIONAL_ENDPOINTS.json).

## Complete source interaction inventory

[INTERACTION_INVENTORY.json](INTERACTION_INVENTORY.json) enumerates every JSX action/control template found in the application, with source file, line, surrounding function, attributes, event wiring and label/target expression. Inventory: **27 Route declarations** (including mapped routes and fallbacks), **185 interactive/control templates**, including 70 Button components, 17 native buttons, 14 forms, 16 selects, 27 inputs, 6 textareas, 25 Links, 3 NavLinks, 4 anchors and 3 modal instances. Repeated employee/shift rows create additional runtime instances of these templates. These counts are source inventory, not a claim that every possible data permutation was tested.

The static scan found four apparent buttons without their own onClick/type: three are valid native form-submit buttons (verification request, invitation-link opening, settings save), and the fourth is the reusable Button primitive which forwards its supplied handlers. They are not orphan actions. Both landing anchors resolve to existing section IDs; the skip link resolves to the main landmark. No remaining empty `href="#"` or visibly advertised action without an implementation was identified. External-provider availability is separately BLOCKED below.

### Every page/route inspected

| Route/page | Local result | Browser evidence |
| --- | --- | --- |
| `/` landing | PASS | Branding, responsive layout, login/signup/demo/safety links; section anchors inspected against IDs |
| `/login` | PASS | Valid/invalid identity handling, show/hide, remembered session, restoration, disabled-unconfigured Google explanation |
| `/signup` | PASS locally; hosted delivery BLOCKED | Name/email/password/confirmation/consent, validation, verification redirect; actual Auth SDK through fixture |
| `/forgot-password` | PASS locally; hosted delivery BLOCKED | Generic non-enumerating request state and PKCE recovery flow |
| `/reset-password` | PASS locally; hosted delivery BLOCKED | Authorized recovery session, matching new passwords, update and logout |
| `/verify-email` | PASS page; actual delivery BLOCKED | Accessible form/links, route, confirmation behavior; resend's real inbox delivery unverified |
| `/auth/callback` | PASS locally; Google provider BLOCKED | Code consumption, safe continuation, cancelled/error/missing-code handling, recovery redirect |
| `/terms`, `/privacy` | PASS routes | Linked documents render at all viewport sizes; operator legal/contact/retention review remains required |
| `/onboarding` | PASS locally; hosted schema BLOCKED | Business/join choices, wizard steps/back, existing-membership handling, empty workplace |
| `/invite` | PASS locally; hosted schema/email BLOCKED | Token fragment, authenticated verified recipient, new/existing account, rotation/revoke/replay, invalid-link recovery |
| `/safety` | PASS | Public synthetic organization selection, submit/receipt/track; no credential screenshots retained |
| `/app/home` | PASS | Worker, employer and empty real-business metrics/checklist; data-backed records |
| `/app/shifts` | PASS | Create/confirm/edit/cancel, payroll recording, calendar/date filter, time-zone conversion |
| `/app/pay` | PASS | Expected/recorded wages, missing payroll state, review request, replay and explanation |
| `/app/payroll` | PASS | Authorized employer wage records; new policy configuration correctly lives in settings |
| `/app/cases`, `/app/disputes` | PASS | All status tabs, response, clarification/reopen, worker confirmation, retained ProofLoop history |
| `/app/report`, `/app/safety` | PASS | Worker submission/tracking and employer five-step case progression through closure |
| `/app/rest` | PASS | Warnings, what-if slider, unsaved preview, confirmed persistence and audit |
| `/app/workforce` | PASS | Authorized member list/counts and corresponding work/review records |
| `/app/employees` | PASS for real business | Add/invite/search/filter/edit/history, wages/status, access lifecycle; demo direct navigation safely redirects |
| `/app/analytics` | PASS | Authorized aggregates and explicit persisted review acknowledgement |
| `/app/profile` | PASS | Identity, organization, time zone, language and logout; generic sector correctly labelled |
| `/app/settings` | PASS | Owner contacts/departments/locations, pay/rest policy, delegated administrator changes and audit history |
| Unknown route / unauthorized protected route | PASS | Fallback or sign-in/authorized-workspace redirect; no private records exposed |

Public pages and worker/employer route matrices were opened at **1440×900**, **768×1024** and **375×812**. Protected URL preservation is asserted, not inferred merely from finding any heading. Horizontal overflow assertions passed. Last navigation items are explicitly scrolled into view and asserted reachable. Relevant keyboard/modal checks cover focus containment, Tab, Escape and mobile menu controls.

### Major buttons, dropdowns, tabs and menus

| Area | Actions verified | Result |
| --- | --- | --- |
| Global navigation | Worker/admin links, mobile open/backdrop close, profile/settings routes, refresh, sector/role demo switching, language English/Tamil/Hindi | PASS in executed journeys; header/avatar handler and anchor targets also inspected |
| Authentication | Sign in, Create account, show/hide both passwords, consent, remembered session, forgot/reset, callback recovery, logout, Reload authentication | PASS local; real email/provider steps BLOCKED |
| Google | Disabled-provider explanation; configured button starts Supabase OAuth with PKCE and trusted callback; cancellation | PASS client handoff/error behavior; real provider success BLOCKED |
| Onboarding | Create My Business, Join My Workplace, wizard Continue/Back, industry, country/location, time-zone input, days/currency/wage policy, Create Business | PASS connected local backend; duplicate creation covered in SQL assertions |
| Employer checklist | Policy/employee/shift links; Review Workforce Dashboard and explicit Mark reviewed | PASS; persisted audit acknowledgement survives refresh |
| Employees | Add, Invite, Save, Save and invite, Cancel, Edit, Search, active/inactive filter, department/job/rate/basis/type/status, history, shift assignment | PASS; SQL/backend values re-read after completed saves |
| Invitations | Invite existing/new account, resend/rotate, revoke, copy/hide private link, token opening/preview/acceptance, invalid recipient/status handling | PASS locally; email provider unavailable is honestly shown |
| Invitation privacy/error | Old/revoked/used token denied; worker self-escalation denied; no raw token hash in ordinary responses; clipboard unavailable gives feedback | PASS local browser/API/SQL; real email delivery BLOCKED |
| Business settings | Save contacts, departments/locations, pay basis/rates/rest settings, Save policy version, grant/remove admin, audit history | PASS; non-owner settings mutation denied |
| Workforce shifts | Create, worker selection, dates/location/break, unconfirmed edit, cancel with confirmation, worker hours confirmation, calendar previous/next/day filter | PASS; cancelled rows retained in PostgreSQL/audit |
| Payroll | Record payroll, expected-versus-recorded calculation, discrepancy review, employer correction | PASS; integer paise and historic snapshots preserved |
| ProofLoop | Fairness Replay, request review, response, Request clarification, reopened response, Confirm resolution, close/Escape | PASS; actual database events and corrected salary verified |
| SafeSignal | Organization/category/priority controls, submit, private receipt, tracking, bad credentials, all five employer transitions, open/all filter | PASS; case identity credentials not sent to AI or returned in admin records |
| RestGuard | Slider, warning/clear threshold, no save during preview, Confirm schedule change, persisted result and event | PASS on isolated data; live read-only preview also passed |
| Saarthi AI | All four topics, multilingual fallback, close/Escape, Read aloud control | PASS fallback/handler; actual Gemini generation and audible output not claimed |
| Error states | Configuration failure, expired/rejected session, invalid invitation, unavailable workforce records and retry, provider-unconfigured/failed states | PASS in injected failure regressions; invalid input/API refusals tested |

### Every form template inspected

| Source form | Operation and persistence evidence |
| --- | --- |
| Auth verification request | Supabase Auth resend handler inspected; page/form accessibility tested; actual SMTP/inbox step BLOCKED |
| Shared Auth form (login/signup/forgot/reset modes) | SDK operations, validation, PKCE/recovery/session tests; real inbox/Google BLOCKED |
| Business wizard | Atomic create + owner/config/policy; browser refresh and SQL duplicate-key retry verified |
| Invitation-link entry | Trusted-origin/path and token syntax; invalid external link rejected |
| Employee create/edit form | Actual `/api/employees`, SQL profile values and access status, later refresh/read verified |
| Business contact/settings form | Actual `/api/business-settings`, owner authorization and persisted re-read |
| Pay policy editor | Actual `/api/policies`, versioned history, default inheritance and protected historic snapshots |
| Safety submit | Actual `/api/safety`, private hash credential storage and event creation |
| Safety tracking | Actual `/api/safety/track`, valid/invalid secret behavior and changing case state |
| Payroll review / clarification | Actual request/reopen RPCs, distinct receipt events, duplicate prevention |
| Employer response | Actual resolve RPC, corrected integer paise and response history |
| Safety case update | Actual `/api/safety/update`, sequential transition validation through closed |
| Shift create/edit | Actual `/api/shifts`, active worker/organization guard, time-zone dates and immutable verified records |
| Payroll recording modal | Actual `/api/payroll`, saved snapshot, calculation receipt and discrepancy workflow |

No business persistence PASS is based solely on a toast or visible button. The connected tests read records after the completed mutation and refresh the relevant pages. Test fixture timestamp and DATE serialization were corrected to match PostgREST, and an early save-test race was corrected by waiting for the save response. Those were test-adapter/timing defects, not production employee-save defects.

## Every observed application endpoint

Counts below come from sanitized transport observations during the complete isolated run. Expected 403/409/404 responses are successful negative-security tests, not unexplained application failures. Auth SDK endpoints are listed separately because they belong to the Auth provider, not the application API.

| Method/path | Observed status/count | Result |
| --- | --- | --- |
| `GET /api/account` | 200 × 297 | PASS in isolated connected stack |
| `GET /api/config` | 200 × 172 | PASS in isolated connected stack |
| `GET /api/demo-organizations` | 200 × 171 | PASS in isolated connected stack |
| `GET /api/employees` | 200 × 23, 403 × 1 | PASS in isolated connected stack |
| `GET /api/health` | 200 × 1 | PASS in isolated connected stack |
| `GET /api/workspace` | 200 × 287, 403 × 1 | PASS in isolated connected stack |
| `POST /api/administrator-access` | 403 × 1, 200 × 2 | PASS in isolated connected stack |
| `POST /api/assistant` | 200 × 6 | PASS in isolated connected stack |
| `POST /api/business-settings` | 200 × 1, 403 × 1 | PASS in isolated connected stack |
| `POST /api/businesses` | 201 × 3 | PASS in isolated connected stack |
| `POST /api/businesses/review` | 200 × 1 | PASS in isolated connected stack |
| `POST /api/demo-session` | 200 × 29 | PASS in isolated connected stack |
| `POST /api/employees` | 200 × 5 | PASS in isolated connected stack |
| `POST /api/invitations` | 201 × 3 | PASS in isolated connected stack |
| `POST /api/invitations/accept` | 200 × 2, 403 × 3 | PASS in isolated connected stack |
| `POST /api/invitations/preview` | 200 × 3, 403 × 2 | PASS in isolated connected stack |
| `POST /api/invitations/resend` | 201 × 1 | PASS in isolated connected stack |
| `POST /api/invitations/revoke` | 200 × 1 | PASS in isolated connected stack |
| `POST /api/payroll` | 200 × 3 | PASS in isolated connected stack |
| `POST /api/policies` | 200 × 4 | PASS in isolated connected stack |
| `POST /api/reviews` | 200 × 3, 409 × 1 | PASS in isolated connected stack |
| `POST /api/reviews/confirm` | 200 × 3 | PASS in isolated connected stack |
| `POST /api/reviews/reopen` | 200 × 1 | PASS in isolated connected stack |
| `POST /api/reviews/resolve` | 200 × 4, 403 × 1 | PASS in isolated connected stack |
| `POST /api/safety` | 201 × 2 | PASS in isolated connected stack |
| `POST /api/safety/track` | 200 × 4, 404 × 1 | PASS in isolated connected stack |
| `POST /api/safety/update` | 200 × 6 | PASS in isolated connected stack |
| `POST /api/shifts` | 200 × 7 | PASS in isolated connected stack |
| `POST /api/shifts/cancel` | 200 × 1 | PASS in isolated connected stack |
| `POST /api/shifts/confirm` | 200 × 3 | PASS in isolated connected stack |

Auth provider operations exercised locally: `/auth/v1/signup`, `/auth/v1/token` (password/PKCE sessions; forced refresh-token expiry not separately verified), `/auth/v1/user` (session/password update), `/auth/v1/logout`, `/auth/v1/recover`; Google `/auth/v1/authorize` handoff was intercepted. Resend provider acceptance/failure/no-configuration branches are unit-tested. None of those fixtures prove a real email reached an inbox or that Google consent completed. Both application health aliases share the inspected handler; `/api/health` was observed in browser and live verifier runs.

## Real Supabase inspection and database operations

Hosted migration history contains only: `fairshift_foundation`, `fairness_check_receipts`, `whole_minute_boundaries`, `serverless_rate_limits`, `versioned_pay_policies`. Local foundation timestamps differ from hosted ones. Neither the proposed performance migration nor `20261031042154_workforce_saas.sql` was applied.

All **11 hosted public tables** have RLS enabled and deny anon SELECT: `organizations`, `organization_members`, `sector_configurations`, `pay_policies`, `pay_policy_events`, `shifts`, `payroll_entries`, `pay_disputes`, `dispute_events`, `safety_reports`, `safety_case_events`. Authenticated access is constrained by protected membership/role policies. Private gateway/credential/rate tables have deliberately no application read policies. The new SaaS tables/functions are absent on the hosted project, which is the schema blocker.

| Database operation | Isolated connected/SQL result | Hosted status |
| --- | --- | --- |
| Business + initial owner/config/pay policy transaction | PASS; rollback on invalid policy, idempotency key retry | BLOCKED pending migration |
| Employee profile/rate/status persistence | PASS; update, deactivate/reactivate, protected membership changes | BLOCKED pending migration |
| Invitations and private token hashes | PASS; pending, rotated, revoked, accepted, expired/replayed rejection, verified-email matching | BLOCKED pending migration/email setup |
| Two-business separation and delegated admin permissions | PASS actual PostgreSQL RLS/RPC + backend | Existing demo tenant isolation PASS with hosted accounts; new SaaS BLOCKED |
| Shift create/edit/assignment/confirmation/cancel | PASS; mutation tests run only on isolated fresh records | Existing authorized reads and risk previews PASS |
| Payroll/snapshot calculation/correction | PASS real SQL, real API, UI and refresh; prior snapshots unchanged | Existing read-only ₹1,100/₹950/₹150 calculation PASS |
| Pay disputes/reopen/close | PASS; duplicate open review denied and history preserved | Existing private reads and cross-tenant denial PASS |
| ProofLoop and business audit append-only history | PASS; application-role overwrite/delete denied in isolated SQL | Hosted SELECT/grants inspected; destructive legacy RLS test not run on existing rows |
| Safety report, tracking hash, status history | PASS; anonymous gateway only, all statuses, bad tracking denied | Existing RLS and private-schema denial PASS |
| Organization policy/history/rest configuration | PASS save/version/history and preview-versus-save behavior | Existing read-only policy/scheduling checks PASS |
| Rate limit persistence | Separate unit tests PASS | PASS real hosted random bucket and two clients; no business-row mutation |

## Verified defects and repairs

| ID | Initial finding / root cause | Small repair and regression | Final state |
| --- | --- | --- | --- |
| QA-01 | Protected deep-link refresh could redirect to `/login` before `getSession()` completed, then to home, losing `/app/shifts` or `/app/pay` | Explicit Auth bootstrap-ready guard; protected route reload and new business shift journey assertions | FIXED, PASS |
| QA-02 | Missing clipboard API threw synchronously in Copy Invitation Link | Optional clipboard access with rejection feedback; browser removes clipboard and clicks action, checks no pageerror | FIXED, PASS |
| QA-03 | New-business settings/checklist sent users to payroll records, where no policy editor existed | Reuse existing PolicyEditor in settings, correct link/anchor, save real policy and refresh; no UI rebuild | FIXED, PASS |
| QA-04 | Add Employee ignored the saved default daily/hourly basis and rate | Default form values derive from the current organization's policy; daily ₹1,600 default asserted before invitation | FIXED, PASS |
| QA-05 | Failed workforce load continued saying Loading indefinitely; invitation preview error also retained Checking status text | Retry action for records; error-state explanation for unavailable invitation; explicit failure/recovery assertions | FIXED, PASS |
| QA-06 | New public Auth/onboarding routes were absent from Vercel SPA rewrites | Add exact client routes while retaining API/health routing; 10 configuration regression assertions; cloud deployment still pending | FIXED locally, cloud verification BLOCKED |
| QA-07 | Generic-sector profile described the workplace as healthcare | Correct generic sector label; manufacturing business/profile assertion | FIXED, PASS |
| QA-08 | Long sidebar contents extended below short viewports; last navigation item was not reachable normally | Internal vertical scrolling without design replacement; last-link visibility/click assertions across viewports | FIXED, PASS |
| QA-09 | Configuration failure could leave protected navigation in a permanent loading state | 15-second config request deadline, resolved bootstrap error path, visible reload-authentication control | FIXED; explicit 503 browser recovery PASS; physical stalled-link timing not separately benchmarked |

The original application controls and existing visual identity remain. No success response was hard-coded into production code, no authorization was relaxed, no records were deleted and no TypeScript errors were suppressed.

## Security findings and limitations

- **PASS:** actual hosted cross-organization reads denied for worker/admin accounts; isolated connected worker self-escalation and unrelated-owner access denied; owner-only settings mutation denied even after employee becomes a delegated admin.
- **PASS:** invitation credentials are unpredictable on the application backend, hashed privately, single-use, recipient/verified-email bound, expiring and revoked/rotated safely; raw passwords are owned by Supabase Auth, not employee tables.
- **PASS:** input validation, safe non-JSON/error messages, duplicate reviews, immutable recorded shifts, append-only financial/safety history, private credential-schema isolation and persistent limiter behavior have executed tests.
- **PASS at scan time:** no configured secret values, private key/API-token signatures or privileged credentials found in included source or seven browser assets. `.env` and test-runtime files remain ignored. Test-only Auth/fixture code is excluded from production entry points.
- **CONFIGURATION FINDING:** Supabase leaked-password protection is disabled. Enable only through an approved Auth configuration change and an eligible plan. [Supabase remediation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- **PERFORMANCE FINDINGS:** six unindexed foreign keys, three per-row Auth/RLS initialization notices and two unused indexes reported. The existing proposed performance migration addresses covering indexes/initplan checks; unused indexes were retained. No live DDL was performed. [Foreign-key advisor](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), [RLS initplan advisor](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan).
- **EXPECTED DENY:** three private tables have RLS enabled without policies. They are intentionally unavailable through ordinary application reads; no permissive policy was added to silence the notice.
- **LIMIT:** the existing explicit 10,000-row read window is not a load-tested enterprise reporting solution; it fails rather than silently publishing partial totals. Large-workspace reporting needs a separately reviewed pagination/aggregation design. Device/browser voice playback and full manual assistive-technology testing remain outside automated proof.
- The routed public/legal pages render correctly; their business-specific legal/contact/retention content still requires operator review before public release.

## Screenshots

Nine **actual Chrome screenshots**, captured from the local application using isolated synthetic records, are in [screenshots/functional-audit](../screenshots/functional-audit/). They are not image-generated, and they do not claim to show production OAuth/email acceptance. Desktop/tablet/mobile dimensions are the requested 1440×900, 768×1024 and 375×812; full-page captures can be taller. New-business/ProofLoop cases use their test context's normal desktop viewport.

- `audit-desktop-worker.png`, `audit-desktop-admin.png`
- `audit-tablet-worker.png`, `audit-tablet-admin.png`
- `audit-mobile-worker.png`, `audit-mobile-admin.png`
- `audit-new-business-desktop.png`, `audit-new-business-proofloop.png`
- `audit-safety-closed-desktop.png`

No passwords, auth tokens or invitation/tracking secrets are shown. A keyboard-focused skip link may legitimately be visible. ProofLoop is a scrollable dialog; a screenshot shows the current visible portion, while assertions verify later events too. Pre-repair defect pixels were not fabricated; failures were recorded in sanitized assertion output and source/DOM evidence, and current screenshots demonstrate repaired behavior.

## Files modified and scope

Shared application files changed, then mirrored locally under existing synchronization approval:

- `src/App.tsx`
- `src/components/AuthExperience.tsx`
- `src/components/BusinessExperience.tsx`
- `src/index.css`
- `vercel.json`
- `tests/e2e/production-domain.spec.ts`
- `tests/e2e/saas.spec.ts`

New shared QA files:

- `tests/e2e/functional-journey.spec.ts`
- `tests/routing.test.ts`
- `tests/functional.config.ts`
- `tests/functional.integration.mjs`
- `tests/support/supabase-fixture.mjs`

Submission-only artifacts: this report, `docs/INTERACTION_INVENTORY.json`, `docs/FUNCTIONAL_ENDPOINTS.json`, the nine `screenshots/functional-audit/*.png` files and updated `docs/FILE_MANIFEST.txt`. `.local` contains ignored runners/logs/test runtime only. No organizer-wide workflow/settings or another student's files were edited. Existing unrelated root modifications remain present and were not reverted or included in a commit.

## Reproduction

From the authorized submission folder, use the existing private environment only for the hosted read-only checks; do not copy it into source.

```powershell
npm run typecheck
npm test -- --maxWorkers=1
$env:NODE_ENV='production'
npm run build
# Optional isolated test dependency, not an application dependency:
npm install --prefix .local/saas-db --no-audit --no-fund --ignore-scripts @electric-sql/pglite@0.3.14
node scripts/test-saas-database.mjs
npx vitest run --config tests/functional.config.ts
```

The harness listens only on `127.0.0.1:8188`, starts with fresh synthetic data and enforces a test-only inbox key. `QA_GREP` is optional for focused debugging; it was unset for the final complete browser run. The connected mutation specifications fail closed if pointed at a hosted URL. Do not run legacy policy/schedule mutation specs directly against shared production demo data. Hosted RLS read-only checks and rate checks read credentials only in process memory; the older destructive RLS mutation script was not executed against existing hosted audit rows.

## Remaining approval/configuration and release decision

1. Review and explicitly approve applying `20261031042154_workforce_saas.sql` once to the existing project, using [SAAS_ROLLOUT.md](SAAS_ROLLOUT.md). Do not replay foundation migrations or reset/reseed data. This audit did not change that migration or apply it.
2. Configure/verify Supabase Google with the intended OAuth client and provider redirect `https://vkkjuopfidvfhzsqzius.supabase.co/auth/v1/callback`; configure the application's trusted callback/allowlist and production site URL. Real Google signup/login remains BLOCKED until tested.
3. Configure approved production SMTP, verified sender/domain and real test inboxes for signup/verification/recovery. Local Resend invitation key/sender are absent. Confirm actual delivery and existing-user invitation acceptance using approved real provider settings. Keep all secrets outside source.
4. Obtain separate commit/push/deployment approval; then verify the exact built version and newly added public-route rewrites on Vercel. Current live read-only passes refer to the existing deployment, not the unpublished SaaS upgrade.
5. Execute the complete 14-step owner/employee workflow on hosted Supabase with isolated synthetic businesses and real verified inbox/OAuth identities, then re-run cross-tenant checks. Verify audible playback and manual accessibility where required.

**Final success condition: BLOCKED for real hosted end-to-end acceptance. PASS for the executed repaired local workflows, with the environment limitations stated above. No blanket production-ready or every-possible-state success claim is made.**
