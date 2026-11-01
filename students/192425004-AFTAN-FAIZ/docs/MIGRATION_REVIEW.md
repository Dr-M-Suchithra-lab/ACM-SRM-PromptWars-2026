# NYAVERIS AI — migration approval packet

1 November: exact SQL/hash unchanged; hosted migration absent; isolated upgrade/rollback checks PASS. Authenticated backup dashboard reports that Free plan does not include project backups. No external restorable backup/recovery rehearsal is verified, so conditional approval remains unexecuted. See [current execution](EXECUTION_2026-11-01.md). No paid upgrade or migration was performed.

Prepared 31 October 2026. **Proposed only; no hosted DDL or data change has been performed.**

## Exact target and SQL

- Existing project: `vkkjuopfidvfhzsqzius`.
- Only migration requested under approval A: [`20261031042154_workforce_saas.sql`](../supabase/migrations/20261031042154_workforce_saas.sql).
- SHA-256: `5afff4672ce350fee26a7c88c27221da48ab92ddd6f3428d940510b70e5b846d`.
- The linked SQL is the full executable change, not a reconstructed summary. It remains unchanged from the reviewed local SaaS implementation.
- The separate [`20261030195131_backend_policy_and_fk_performance.sql`](../supabase/migrations/20261030195131_backend_policy_and_fk_performance.sql) is optional and **excluded from approval A**. The SaaS migration was tested with it omitted.
- Never run a blanket migration push: the five hosted foundation migration timestamps differ from local filenames. Do not replay them, provision users, run seed.sql, reset data or create a project.

## Hosted comparison

Read-only inspection confirmed these five existing migration names: `fairshift_foundation`, `fairness_check_receipts`, `whole_minute_boundaries`, `serverless_rate_limits`, `versioned_pay_policies`. All 11 existing public tables have RLS enabled. Existing memberships retain `worker`/`admin`; there is no owner role value in that constraint. The SaaS RPC and all six new tables below are absent; `organization_members.active` and `shifts.cancelled_at` are absent. Existing `private.is_member`, `private.save_shift`, `private.audit_fairness_check` definitions and shift/payroll triggers were inspected before preparing this plan.

| Missing object/change | Exact purpose and existing-data effect |
| --- | --- |
| `organization_members.active boolean not null default true` | Existing memberships stay active; future deactivation takes effect in the central membership guard |
| `shifts.cancelled_at timestamptz` | Existing shifts receive NULL; cancellation retains rows/history |
| `public.business_settings` | Owner UUID, owner-scoped request key, contacts, industry/location, workforce days/currency/departments/work locations; empty on migration |
| `public.user_profiles` | Auth-linked display name only; no passwords; empty on migration |
| `public.employee_profiles` | Tenant-scoped employee identity, rates, employment/access status and linked membership; empty on migration |
| `public.organization_invitations` | Tenant/email/profile binding, pending/accepted/revoked state, expiry and acceptance metadata; empty on migration. Expired is derived from the timestamp |
| `public.business_events` | Append-only business audit history; empty on migration |
| `private.invitation_credentials` | Only SHA-256 hashes of unpredictable invitation tokens; no ordinary application-role table access |
| New uniqueness/foreign keys/checks | Membership/profile/organization consistency, unique per-company email/employee code/user, idempotency key, positive bounded integer paise and bounded text/day values |
| Ten explicit indexes | `invitations_pending_email`, `employees_org_status`, `employees_user`, `invitations_recipient`, `invitations_employee`, `invitations_creator`, `invitations_acceptor`, `business_events_org`, `business_dashboard_review_once`, `business_events_actor`; PK/unique constraints also create their normal indexes |
| New functions | `private.is_owner(uuid)`, `private.saas_action(text,uuid,jsonb)`, invoker wrapper `public.saas_action(text,uuid,jsonb)`, trigger function `private.saas_shift_guard()` |
| Replaced functions | `private.is_member(uuid,boolean)` adds active-access checking; `private.save_shift(...)` supports authorized reassignment; `private.audit_fairness_check()` freezes employee rates before new receipts while respecting saved snapshots |
| New trigger | `a_saas_shift_guard` on shifts guards direct RPC use, inactive workers, cancelled/recorded shifts and new policy snapshots |
| Sector constraint/configuration | Expand `sector_configurations_id_check` to include `generic`; insert one General workplace configuration. Preserve construction and healthcare rows |
| Grants and policies | Five new public tables: authenticated SELECT constrained by RLS, no direct application-role writes. Private credential table: no application-role access. Narrow transactional RPCs perform authorized writes |

## Existing records and risk

Observed hosted baseline (counts only, no personal data extracted): 2 organizations, both demo; 4 memberships; 18 shifts; 14 payroll entries; 13 disputes; 116 dispute events; 10 safety reports; 25 safety-case events; 0 pay-policy events. These are a timestamped observation, not a promise that concurrent users cannot add rows. Recheck immediately before an approved migration.

There is no UPDATE/DELETE of existing business rows in the migration. It adds default column values, a generic configuration and new database objects. Existing Auth users, demo ownership, policy snapshots and payroll history are retained. Future function behavior changes, particularly membership checks and snapshot capture, are intentional and require postflight checks. DDL briefly locks existing membership/shift/sector objects; the file has a 3-second lock timeout and 30-second statement timeout. An exceeded timeout must abort the transaction, not prompt a destructive retry.

The owner is a protected `business_settings.owner_user_id`, never frontend/user_metadata authority. Business creation uses an authenticated verified user plus owner/request-key advisory locking, and inserts organization, owner membership, configuration and policy atomically. Invitations require a confirmed recipient email, matching hash/tenant/profile, unexpired pending state and single-use atomic acceptance. `SECURITY DEFINER` functions have a fixed empty search path and explicit checks; the exposed wrapper is `SECURITY INVOKER`. PUBLIC/anon execution is revoked. Authenticated execution of the private implementation is necessary for the invoker wrapper and is guarded internally; the private schema must remain outside exposed Data API schemas.

## Approved execution procedure

1. Recheck project, migration history, object definitions and current counts. Confirm an operator-controlled restorable backup/PITR point and capture current function/trigger definitions and grants. Backup availability/restore procedures are **not verified** by this audit; do not apply until the operator confirms them. Check for long transactions and schedule a quiet window.
2. Apply **only the SHA-256-matched SaaS file** in one explicit transaction through an approved migration mechanism, recording its migration version. Preserve the short timeouts. Failure means rollback of the whole transaction; do not reset/reseed or partially resume statements. Restore session timeout defaults afterwards if the execution connection is reused.
3. Recheck original counts/rows (allow explained concurrent additions), old snapshots and demo access. Confirm all old memberships active, old shifts uncancelled, generic configuration present, new tables initially empty, RLS enabled, expected grants and no anon RPC access. Run security/performance advisors.
4. Keep `ENABLE_SAAS=false` until the separately approved application configuration/deployment is ready. Applying SQL alone does not enable the current live UI.
5. After separate B/C approvals, run two isolated synthetic businesses through real signup, verified inbox/Google, invitation, payroll/dispute and safety acceptance; test direct cross-tenant/role denials. Preserve the resulting audit history.

## Rollback and verification

Before commit: any DDL/data failure rolls back the complete transaction. An isolated forced division-by-zero at the end of this exact file verified that new objects disappeared and all prior rows remained unchanged.

After commit: prefer an authorized application rollback/feature-flag disable while retaining new tables, accounts and audit history. Do **not** drop new objects or reverse the sector allowlist after new businesses exist. A database function rollback requires separate review of new-record dependencies and original definitions/grants. A backup restore can discard subsequent legitimate writes; it is an operator incident procedure, not an automatic rollback command.

Executed on ephemeral PostgreSQL/PGlite with synthetic Auth rows and actual SQL, without hosted requests:

- `SAAS_TEST_INCLUDE_PERFORMANCE=false node scripts/test-saas-database.mjs`: **53 assertions PASS**; atomic creation, idempotency, invitation replay/expiry/revoke, permissions, isolation, financial history.
- `node scripts/test-saas-database.mjs`: **53 assertions PASS** including optional performance migration.
- `node tests/migration-upgrade.mjs`: **47 assertions PASS**, five foundation migrations, optional performance migration omitted, 15 existing tables compared, existing rows preserved, forced-failure transaction rolled back.
- These are PostgreSQL integration proofs, not a hosted backup restore, full Supabase Auth service or production lock-duration test. Hosted acceptance is still BLOCKED pending approval.

**Approval A requested:** apply only the reviewed SaaS migration to this existing project once, following the above preflight and postflight. No Auth/email settings, deployment, Git push or optional performance migration is included.
