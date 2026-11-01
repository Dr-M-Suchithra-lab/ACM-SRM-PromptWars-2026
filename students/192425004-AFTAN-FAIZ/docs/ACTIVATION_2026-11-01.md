# NYAVERIS AI — activation and submission audit, 1 November 2026

This supersedes older readiness and README statements. Code and documentation preparation are complete; real SaaS activation is **not** complete while its backup/database/provider prerequisites remain blocked.

## Current hosted boundary

The existing Supabase project has five foundation migrations, 11 public tables with RLS, and no `public.saas_action(text,uuid,jsonb)`. The approved migration's SHA256 remains `5afff4672ce350fee26a7c88c27221da48ab92ddd6f3428d940510b70e5b846d`. No migration, optional performance SQL, seed, reset, new project or production workforce write was performed. The owner explicitly reconfirmed that no private backup connection or disposable restore environment is configured and that the migration must remain unapplied.

[Exact private backup and restore steps](OPERATOR_BACKUP_RESTORE.md) cover existing-project connection services, credentials outside chat/Git, consistent full export, roles, required schemas, disposable local restoration, record/function/RLS/grant comparisons and Auth/Storage/provider limitations. `scripts/backup-baseline.sql` was executed as a read-only query against the existing schema: it returns aggregate manifests, not a restorable backup. **Backup verification remains BLOCKED.**

## Fresh authentication acceptance

With the owner's specific approval, one new synthetic signup was submitted to the existing Auth project using a Gmail plus-alias. It returned HTTP 200, created one identity, required confirmation and did not issue a session. The corresponding email was genuinely received; exact recipient and fresh timestamp were checked, and its signed link targets the existing project with the correct production callback. Tokens/passwords and the actual private test address are not published.

The confirmation link was **not clicked**. The user stopped Computer Use with Escape, and all further browser control stopped. Email confirmation/session establishment therefore remains **BLOCKED/unverified**, not PASS. No recovery email was sent, no existing account password was reset, and no new password was shared or retained in source. Future recovery/verification links must be started in the original browser for PKCE; a receipt alone does not establish callback success.

Existing email signup/login/recovery/Google callback implementations were preserved. Google remains disabled pending private credentials and real consent. New owners see the actual migration gate rather than demo data or a fabricated company. Business creation, employee management and invitation acceptance are tested in isolated SQL/Auth fixtures; hosted acceptance remains BLOCKED until rollout prerequisites pass.

## Safe changes in this continuation

- Removed the remaining current legacy labels from the engineering-rules heading, CI workflow name, Vercel helper messages and future Cloud Run runtime display label. Existing cloud resource IDs were not renamed and no cloud helper was executed.
- Tightened the current-product branding test to catch joined, spaced, hyphenated and underscored spellings. It exempts exact compatibility tokens only, never a whole source line. Current engineering/CI headings are checked as well.
- Extended closed-category provider diagnostics to distinguish credentials, invalid request/schema parameters, billing, location and model failures, including non-Error SDK objects. Only allowlisted Google status values and diagnostic enums are logged. Raw errors, prompts, credentials and employee data remain excluded. No AI availability badge was reintroduced.
- Rewrote the participant README to the organizer's required six sections. Removed dangerous blanket migration/seed/new-project instructions and stale claims that registration was absent. Prompt history and genuine screenshots remain untouched.

## Verification actually executed

| Check | Result |
| --- | --- |
| TypeScript | PASS |
| Unit/API/native serverless | 203 PASS, 0 FAIL |
| Full isolated browser suite | 40 PASS, 0 FAIL |
| Both production builds | PASS |
| Read-only hosted backup-manifest query | PASS; no backup/export/restore inferred |
| Existing pending-migration hash | PASS, unchanged |
| Secret scan, SQL/RLS, synchronization and final live release checks | See final handoff for freshly executed counts/status |

The full browser suite includes real isolated PostgreSQL persistence for owner/employee operations, shifts, payroll, review/worker confirmation, ProofLoop, safety transitions/tracking and refresh, plus authentication adapters, tenant denials, accessibility and mobile behavior. It does not prove hosted owner creation, actual OAuth consent, invitation inbox receipt or audible device voice. No hosted workforce record was used as a destructive test fixture.

## Exact branding exceptions

The active product is NYAVERIS AI. Do not claim zero raw repository occurrences: historical/technical references and detection tests remain deliberately.

- `src/App.tsx`: `fairshift-language` is the existing browser preference key; changing a product label does not require discarding users' stored language choice.
- `server/app.ts`, `.env.example`, provisioning/RLS/backend verification scripts, synthetic Auth fixtures and existing account tests: `@demo.fairshift.example` identifies protected existing demo Auth identities. These are not display-brand labels and were not renamed.
- `supabase/migrations/20261027051050_fairshift_foundation.sql` and references to `fairshift_foundation` in setup/migration/audit documents and the manifest: applied migration identity/history must remain authentic.
- Participant and application `README.md`: the original **FairShift — Decent Work Platform** challenge title is historical problem-statement context, not the current app name. The complete official wording is absent from the organizer's public instructions and supplied evidence; no invented statement is presented as verbatim.
- Application-only `docs/DEPLOYMENT.md` and `scripts/deploy.py`: `fairshift-saakshi-ai`, `fairshift-runtime`, `fairshift-demo-password`, `fairshift-safety-password`, `fairshift-gemini-key` are historical Cloud Run/service/secret identifiers. No existing resource was renamed and no Cloud Run deployment is claimed. The human-facing runtime display name is now current.
- Application `docs/VERCEL_DEPLOYMENT.md`: the old project slug appears only as an explicit in-place rename/history note or original challenge reference.
- `prompts.md`: genuine historical excerpts remain authentic. They are not current interface copy.
- `tests/e2e/branding.spec.ts`, `tests/repair-regression.test.ts`, participant capture checks and this audit: obsolete names appear as detection/exception evidence. This is necessary verification metadata, not active product branding.

Actual case-insensitive published-tree/build occurrence totals and current visible-brand checks are recorded in the final handoff after publication. Raw occurrence totals include the exceptions above.

## Submission compliance and remaining operator steps

The organizer README requires (1) problem statement as given, (2) a three-to-five-line solution, (3) tools, (4) run instructions, (5) demo link, (6) key prompts. The participant README now has these six sections, with the supplied original challenge title and an explicit full-statement provenance limitation. Complete source, authentic prompts and existing screenshots remain included.

The organizer requires a PR to record submission time. No PR existed for the participant branch at inspection. The user's no-automatic-PR instruction remains in force; normal pushes do not constitute an official PR submission. Create the single submission PR manually if required. No organizer root/main or other student's files may change.

Remaining prerequisites: verified real backup/restore before the exact approved SaaS migration; separately controlled rollout; Google OAuth and verified invitation sender configuration; completed fresh inbox/callback/password-recovery and hosted two-company acceptance; successful genuine Gemini generation; physical Windows/Android/iPhone voice checks. The original recorded Cloud Run event rule remains distinct from the requested working Vercel deployment.
