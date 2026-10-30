# NYAVERIS AI — Submission verification

Verified on **31 October 2026 (Asia/Kolkata)**. This report describes the submitted copy, not a new deployment.

| Check | Result |
| --- | --- |
| TypeScript | `npm run typecheck` passed, including the submission-scoped security checker |
| Unit/API integration tests | `npm test`: 90 tests passed across 8 files |
| Production build | `npm run build` passed: TypeScript, Vite frontend, esbuild Node server |
| Existing browser tests | 2 passed: `branding.spec.ts` and `accessibility.spec.ts`; worker axe check reported zero violations |
| Additional browser checks | Production health, unauthenticated denial, exact title/wordmark, sign-in, SafeSignal form, synthetic worker/employer login, wage records, persisted ProofLoop replay, mobile overflow and RestGuard preview passed; no page JavaScript errors |
| Supabase isolation | `npm run test:rls:readonly`: all 11 SELECT-only assertions passed |
| Screenshots | 9 genuine PNGs; all views reviewed for branding and visible credentials |
| Source completeness | Every existing file in src/public/api/server/shared/tests copied; all 5 migrations byte-identical; seed preserved |
| Credential scan | Submission files and built browser assets passed configured-secret-value and credential-signature scans; no private .env included |
| Scope | Git status outside the submission matches the pre-task baseline; pre-existing changes were left alone |
| Remote organizer state | Before upload: participant branch created from main at `a6809d1965edbbb07e19ca9d9e1aa9618aa4ef31`; comparison was identical, zero commits and zero changed files |

## Exact scope and reproducibility

Commands ran from `students/192425004-AFTAN-FAIZ/`. Temporary files, reports and generated build output stayed within this folder and are ignored. Existing installed dependencies in the parent checkout were reused; a separate clean `npm ci` installation was not run. The dependency versions/lockfile are preserved except for the package name. No new dependency was added.

The first sandboxed test attempt had 30 loopback EACCES failures and 60 passes. With loopback access allowed, all 90 passed. The failed sandbox attempt is not counted as a passing run. Vite emitted two non-fatal dependency annotation warnings; the production build completed successfully.

The capture script read the existing dedicated synthetic environment file into process memory without copying it. Browser sessions and safety credentials were not saved in the submitted artifacts. No Gemini call or business-record write was used for capture; the existing authentication/rate-limit infrastructure remains active.

The existing two Playwright tests were run against the submitted production build. The full browser suite and mutation-based RLS suite were not rerun, because they append business records or persist schedule/payroll changes. Current live synthetic schedules differ from the original seed, so the RestGuard screenshot uses an explicitly unsaved 13:00 preview to show a 6h gap; the 18:00 preview also passed. There was no schedule reset.

## Intentional changes in the submitted copy

- `src/App.tsx`: literal spacing between NYAVERIS and AI in the existing styled wordmark.
- `server/index.ts`: startup message uses NYAVERIS AI.
- `server/app.ts`: health-response service label uses NYAVERIS AI.
- `tests/e2e/branding.spec.ts`: matching exact-name assertions updated for the wordmark space.
- `package.json` and `package-lock.json`: package metadata name is `nyaveris-ai`; dependency graph unchanged.
- `scripts/security-check.ts`: scans this submission and its browser output, rather than repository-wide files/branch counts; preserves secret detection without inspecting other students.
- `.gitignore`: explicitly includes the placeholder-only `.env.example` under the parent ignore rules.
- Documentation: submission README, truthful recovered prompt excerpts, current setup instructions, screenshot provenance, target and this report.
- `scripts/capture-submission.mjs`: reproducible genuine capture/read-only UI checks.

No calculation engine, API route, database schema/migration, identity fixture, protected membership logic, AI integration or deployment configuration was changed. The existing application source and Vercel deployment were preserved. Historical database identifiers and synthetic email domains remain technical compatibility identifiers, not application branding.

## Outstanding owner steps

1. Supply the exact organizer-issued problem statement or official link. The README includes the supplied challenge title and an implementation summary, explicitly marked as not a verbatim official statement.
2. Review the prepared files, source manifest, screenshots and recovered prompt excerpts.
3. Commit/upload approval was explicitly provided for the 79 listed files on the exact uppercase branch. Verify the remote changed-file list before authorizing a pull request. Do not push the unrelated local application's branch history into the organizer repository.
4. Separately authorize a pull request when ready. The organizer README says PR creation establishes submission time. No PR, merge or official submission was performed.

The latest organizer GitHub README was inspected for submission structure. Earlier development prompts mention an original Cloud Run hosting rule; this preparation preserves Vercel and the portable Dockerfile and does not configure Google Cloud or claim Cloud Run compliance. Live Gemini, container execution and a clean dependency install were not verified in this task.

## Pre-existing changes outside the submission

These were present before preparation and remain untouched by this task:

```text
README.md
docs/ARCHITECTURE.md
package.json
scripts/provision.ts
scripts/security-check.ts
server/ai.ts
src/App.tsx
src/index.css
tests/ai.test.ts
tsconfig.json
docs/OPTIMIZATION_REPORT.md
scripts/rls-readonly-test.ts
src/components/Field.tsx
src/lib/api.ts
tests/api-client.test.ts
tests/authenticated-api.test.ts
tests/e2e/quality-regression.spec.ts
tests/engine-boundaries.test.ts
```

## Exact-uppercase follow-up

The latest participant request requires `192425004-AFTAN-FAIZ` and `students/192425004-AFTAN-FAIZ/`. The existing local folder and preparation branch were normalized by case without creating another source copy or changing HEAD. The exact organizer branch was created from main; the earlier mixed-case remote branch remains untouched. Source/migration/seed hashes are unchanged. Unit/API tests were rerun from the uppercase folder: 90 passed across 8 files. See BRANCH_AUDIT.md.

Typecheck, all 90 unit/API tests and production build passed again from the exact uppercase folder. The public Vercel landing page returned HTTP 200 with the exact NYAVERIS AI browser title; `/api/health` returned HTTP 200 and healthy status. No deployment change was made.
