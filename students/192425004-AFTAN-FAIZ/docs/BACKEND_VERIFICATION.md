# NYAVERIS AI — Backend verification and repair report

Audit date: **31 October 2026 (Asia/Kolkata)**. Application name remains **NYAVERIS AI**.

Repository: `Dr-M-Suchithra-lab/ACM-SRM-PromptWars-2026`  
Authorized branch: `192425004-AFTAN-FAIZ`  
Allowed path: `students/192425004-AFTAN-FAIZ/`  
Existing deployment: https://nyaveris-ai.vercel.app  
Existing Supabase project: `vkkjuopfidvfhzsqzius`

## Outcome and deployment boundary

The essential worker/admin, pay-review, ProofLoop, anonymous safety and scheduling workflows succeeded against the actual existing synthetic database. Reproduced edge-case defects were repaired in the local submitted source. The existing production deployment passed separate read-only checks. **This audit preceded publication. The owner subsequently approved synchronized source commits/pushes to both repositories. Hosted migrations and deployment approval are separate from the audit results below.** This report does not claim the new fixes are deployed or that live Gemini succeeded.

No new repository, branch, Supabase project or database was created. No records were deleted; no reset, reseed, force-push, PR, merge, hosted migration, production configuration change or deployment was performed. Existing source design and feature names are preserved.

## Actual problems, causes and repairs

| Finding | Root cause | Local repair and evidence |
| --- | --- | --- |
| Consecutive-day limits above seven never warn | RestGuard reused its seven-day overtime window for day streaks, despite allowing 1–30-day policies | Separate per-worker history from the overtime window; a nine-day streak against an eight-day limit now warns, while an intervening day off clears the streak |
| AI explanations could use invented zero recorded pay, or misclassify policy-read errors | The assistant route ignored Supabase policy/payroll read errors | Return safe HTTP 503 before explanation when either read fails; zero pay remains distinct from a failed query |
| Server-rejected sessions lacked a reliable route back to sign-in | Browser transport discarded HTTP status and UI retained the rejected identity | Typed API errors preserve status; a 401 for the still-current token clears only that local session. An actual browser interception test verified sign-in recovery |
| Proxy failures exposed JSON parser diagnostics | Transport assumed every response was JSON | Non-JSON error bodies now produce stable status-bearing errors; raw upstream diagnostics are not displayed |
| Test artifacts could capture credentials | Automatic traces and failure screenshots could retain Auth responses or anonymous receipts | Automatic trace/screenshot capture disabled; explicit reviewed screenshots remain available. Safety-token assertions use booleans to avoid exposing the received token |
| Three browser checks assumed the seeded hospital schedule had never been corrected | The persisted synthetic schedule already differed from the original example | Explicitly preview 13:00 and 18:00 without saving, rather than resetting stored data or weakening the assertion |

Five newly added failing regression cases reproduced the scheduling, read-error and transport problems before repair (90 existing tests still passed). Final tests also cover all authenticated mutation input schemas and the existing policy/reopening RPC contracts. No tests were disabled to manufacture a pass.

## Verification results

| Verification | Observed result |
| --- | --- |
| TypeScript | `npm run typecheck` passed |
| Isolated unit/API tests | **106 passed across 8 files** |
| Production build | `npm run build` passed: TypeScript, Vite and esbuild Node server |
| Existing Playwright tests | **12 passed** against the local production build and real synthetic Supabase data |
| Comprehensive verification driver | **95 recorded checks passed** against the repaired local production build, using real API/database/browser workflows |
| Existing public Vercel deployment | **41 recorded read-only checks passed**; no new business fixtures created in this run |
| SELECT-only Supabase RLS tests | **11 passed** |
| Existing serverless security tests | **5 passed**: persisted limiter threshold, shared client state, worker denial, private bucket denial, policy denial |
| AI | English/Tamil/Hindi validated fallback responses passed; malformed output, provider failures and timeouts are covered by unit tests |
| Credentials | No credentials emitted by the verification driver; no browser traces/videos/receipt screenshots saved by it |

The driver later gained an additional early authorized-origin guard and a script-relative working directory; these are safety guards, not additional business-workflow passes counted above. `node --check` passed. Existing dependencies were reused; no dependency was added. Vite's two existing dependency annotation warnings are non-fatal.

Two existing Playwright tests were deliberately not executed: the policy-edit test overwrites the shared policy, and the old schedule-persistence test overwrites the original hospital shift. Neither was disabled in source. Schedule persistence was instead verified on newly created QA shifts; policy schemas, authorization, snapshots and RPC wiring were inspected/tested without editing the shared policy. A fresh successful admin policy edit was not claimed.

The legacy mutation-oriented RLS script includes delete attempts against existing audit events, so it was not run. SELECT-only RLS tests, actual hosted privilege inspection and a rejected update against new QA events verified the relevant restrictions without any deletion attempt.

## Authentication and authorization

All four existing construction/healthcare worker/admin synthetic accounts signed in through actual Supabase Auth, loaded the expected protected membership and tenant, and rejected foreign-tenant API access. Missing and invalid bearer tokens returned 401. User-editable metadata is not used for roles. Normal email/password worker sign-in, browser refresh/session restoration, worker/employer logout, mobile overflow checks and local expired-session recovery succeeded.

The server uses `auth.getUser` and protected organization membership. Exposed business tables grant application roles SELECT only with RLS. Authenticated mutation RPCs use caller identity and explicit guarded private functions. Public wrappers are SECURITY INVOKER; private mutation functions are SECURITY DEFINER with empty search paths and membership checks. Anonymous database roles cannot execute them. The safety gateway has no organization membership or application SELECT grant on private tables.

## API and essential workflow coverage

Health, public config, demo organizations/login, workspace, shifts/create/confirm, payroll, request/resolve/reopen/confirm review, safety submission/tracking/admin progression and multilingual assistant routes were exercised through their existing methods and frontend contracts. Invalid authenticated inputs were rejected before an RPC. Policy update input/forwarding and worker denial passed without changing an existing policy.

- **Payroll/Fairness Twin:** the seeded example remained 110000 expected / 95000 recorded / 15000 discrepancy paise. A new QA shift reproduced it, persisted the review, rejected a duplicate review and worker payroll correction, accepted the employer correction, reopened for clarification and closed only after worker confirmation. Current/historical policy snapshots remained present. Daily rates, overtime, unpaid breaks, overnight/DST offsets, rounding and currency boundaries passed deterministic tests; AI never computes wages.
- **ProofLoop:** real PostgreSQL events recorded schedule save, hours confirmation, payroll, fairness check, review request, employer responses, clarification and worker closure. The first correction retained previous 95000 and corrected 110000 paise. An application-admin attempt to overwrite new QA audit events was denied. Frontend replay orders by timestamp.
- **SafeSignal:** both direct API and browser form submissions generated random credentials; invalid credentials failed; valid tracking returned persisted status. Worker/foreign-tenant updates and skipped statuses failed. The new QA cases progressed through permitted states. Hosted metadata confirms no employee-identity column on safety reports, SHA-256-format stored credential hashes, and zero private-table SELECT grants. No raw anonymous credentials were printed, saved or sent to AI.
- **RestGuard:** a new QA overnight pair produced a six-hour warning; an explicit admin confirmation moved only the new QA shift to an eleven-hour rest window and persisted its event. The existing hospital schedules stayed unchanged. Browser previews at 13:00/18:00 did not save changes. Long shifts, worker isolation, overlaps, repeated overtime and consecutive-day limits passed unit tests.
- **Saarthi AI:** official `@google/genai` is server-only; context contains calculated pay facts, not identity or safety credentials. Existing structured-output validation, provider timeout and deterministic fallbacks work. Current live responses were fallback. No live model capability or Gemini request success is claimed without a configured provider response.

## Supabase findings and proposed changes

The connected project reported `ACTIVE_HEALTHY`. It contains exactly two demo organizations and four protected memberships. All public/private application tables have RLS, foreign-key constraints are validated, private credential reads are denied, and the gateway has zero organization memberships. The five expected hosted migration names exist; their timestamps differ from local filenames. Required snapshot/version/rate-limit schema and functions were present.

Security advisors reported three informational private-table RLS/no-policy findings (intentional deny-all) and disabled leaked-password protection. Performance advisors reported six missing foreign-key indexes, three per-row Auth RLS evaluations and two currently unused indexes. The existing unused indexes were retained. The inspected initial log aggregates showed no 5xx Supabase edge responses in that window; this is not a complete production logging audit.

See [the exact proposed migration, risks and rollback plan](BACKEND_DATABASE_PLAN.md). It is **not applied**. No database schema, RLS predicate, grant, index, migration history, Auth setting or plan was changed.

Bounded new synthetic records were appended by the custom driver and existing permitted browser workflow tests. Existing shared policies/schedules were not overwritten. These clearly marked QA rows and their append-only events remain in the demo database; they were not deleted or reset. A new random test rate-limit bucket was used to verify cross-client throttling.

## Vercel and configuration

The existing public deployment successfully served the frontend, API health/config, all four demo sign-ins, actual workspaces, permissions and three-language fallback explanations. Both frontend public config and backend requests resolved to the expected Supabase URL and the same working publishable key; no key value was output. Current Functions routing and protected frontend navigation worked. Vercel configuration was not changed.

The linked existing project is `nyaveris-ai`. A read-only environment inventory request using existing CLI authentication returned HTTP 403. Therefore the exact production variable inventory could not be independently enumerated. Successful runtime configuration, authentication, safety gateway/rate-limiter operation and fallbacks are separate positive evidence, not a claim that every optional variable is set. Optional `RATE_LIMIT_SALT` is documented; its existing gateway-password fallback was preserved. No production secret was copied or displayed.

## Reproduction

Run from this submission folder, with your own private `.env` or an absolute `SUBMISSION_ENV_FILE` path. Never include environment files in Git.

```powershell
npm run typecheck
npm test
npm run build
# Requires the existing isolated synthetic project; adds only new QA fixtures:
$env:VERIFY_SYNTHETIC_WRITES='true'
node scripts/verify-backend.mjs
# Existing deployment: runtime checks only, no new business fixtures:
$env:VERIFY_SYNTHETIC_WRITES='false'
$env:BACKEND_VERIFY_URL='https://nyaveris-ai.vercel.app'
node scripts/verify-backend.mjs
npm run test:rls:readonly
npm run check:security
```

The verifier refuses other deployment origins/projects and keeps secrets in process/browser memory. It writes sanitized results into ignored `.local/`. For the 12-test browser subset, run Playwright with `--grep-invert "admin edits daily policy|confirmed schedule adjustment persists"` against running frontend/backend services and the synthetic project.

## Remaining approvals and limits

1. Review and approve the proposed database migration before it is applied; repeat advisors/RLS afterward.
2. Review leaked-password protection availability. Official Supabase documentation requires Pro or above; no billing or security-setting change was authorized/performed.
3. Provide renewed read access only if a precise Vercel variable inventory is needed; the existing credential was denied with 403.
4. Configure a valid Gemini key/model privately and approve production configuration changes if live AI verification is wanted. Fallbacks remain functional.
5. Source commits/pushes to both repositories have been explicitly approved. Confirm any automatic Vercel deployment separately and verify the resulting live application. No hosted database migration is included in source-publication approval.

Remote README.md and prompts.md have newer user edits than this local preparation copy. They were left untouched. Any later publication must use the current organizer branch as its base and publish only the reviewed changed paths, preserving those newer documents.

## File and Git safety

The exact authorized branch was checked before edits. All file writes for this task are within the authorized submission folder. Existing uncommitted root changes outside it were recorded and preserved. No main/other-student file, GitHub branch, workflow or repository setting was changed. No secret was committed during the audit; source publication was authorized afterward. Complete changed-file and scan results are verified separately before handoff.

### Files modified in this task

- `.env.example`
- `docs/FILE_MANIFEST.txt`
- `playwright.config.ts`
- `server/app.ts`
- `shared/engines.ts`
- `src/App.tsx`
- `src/lib/api.ts`
- `tests/api-client.test.ts`
- `tests/authenticated-api.test.ts`
- `tests/e2e/production-domain.spec.ts`
- `tests/e2e/quality-regression.spec.ts`
- `tests/e2e/workflows.spec.ts`
- `tests/engine-boundaries.test.ts`

### New reviewable files

- `docs/BACKEND_DATABASE_PLAN.md`
- `docs/BACKEND_VERIFICATION.md`
- `scripts/verify-backend.mjs`
- `supabase/migrations/20261030195131_backend_policy_and_fk_performance.sql`

The CLI-generated `supabase/.temp/cli-latest` version cache is ignored and excluded from the source manifest. It was retained rather than deleting files.
