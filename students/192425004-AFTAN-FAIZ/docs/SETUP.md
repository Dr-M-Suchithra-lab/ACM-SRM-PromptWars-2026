# Local setup and dedicated Supabase provisioning

Requirements: Node.js 24, npm, and a dedicated Supabase project. Never run the synthetic seed against an unrelated or production project.

## Run this configured workspace

This submission contains no private `.env`. Create one from `.env.example` using your own dedicated synthetic project. Never copy private environment files into the submission.

```powershell
npm ci
# Terminal 1
npm run dev
# Terminal 2
npm run dev:web
```

Open http://127.0.0.1:5173. Explore Worker Demo or Explore Employer Demo. Use the synthetic-environment selector to switch industry and role. These actions authenticate separate Supabase identities; the UI cannot change the authenticated role itself.

For a single production-mode local server:

```powershell
npm run build
$env:NODE_ENV='production'
npm start
```

Open http://127.0.0.1:8080. Environment values are read server-side at startup; public Supabase configuration is provided through `/api/config`. Vite does not need any `VITE_*` secrets or separate build-time settings.

## Provision a fresh dedicated project

1. Copy `.env.example` to `.env`. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from the project dashboard. Set long random `DEMO_PASSWORD` and `SAFETY_GATEWAY_PASSWORD`. Set `ENABLE_DEMO=true` only for a dedicated synthetic project.
2. Temporarily set the server-only `SUPABASE_SECRET_KEY` to provision synthetic Auth users. Run `npm run db:provision`. This uses the supported Supabase Admin API and creates four synthetic demo accounts plus one restricted gateway account. It does not print passwords.
3. Apply every SQL file in `supabase/migrations/` in filename order through an authorized SQL connection to the dedicated project. Do not omit the rate-limit or policy-version migrations. All public tables use RLS; application roles have read grants only and explicit guarded RPC grants.
4. Apply `supabase/seed.sql` exactly once on the fresh database. Seed uses fixed user IDs created by the provisioning script and fixed UUIDs for the two organizations. It contains only synthetic workplace data. Enroll the gateway after users exist:

```sql
insert into private.gateway_accounts(user_id)
values ('20000000-0000-4000-8000-000000000005') on conflict do nothing;
```

5. Remove `SUPABASE_SECRET_KEY` from the runtime environment. The application never needs it. Set `SAFETY_GATEWAY_EMAIL=safety.gateway@demo.fairshift.example` and its random password. Keep this account out of `organization_members`.
6. Configure Supabase Auth Site URL for the deployed origin and limit allowed redirects. No public signup or user-editable role onboarding exists. Provision real organizations/members through an authorized administrative process, separate from demo projects.
7. Run `npm run test:rls`, then the browser tests. Run security advisors. Informational notices for the two private tables with RLS and no policies are intentional deny-all behavior.

## Environment variables

| Variable                 | Exposure          | Purpose                                          |
| ------------------------ | ----------------- | ------------------------------------------------ |
| SUPABASE_URL             | Public            | Dedicated Supabase URL                           |
| SUPABASE_PUBLISHABLE_KEY | Public            | Browser/server user-scoped requests              |
| SUPABASE_SECRET_KEY      | Provisioning only | One-time Auth Admin API; never deploy            |
| SAFETY_GATEWAY_EMAIL     | Server            | Dedicated least-privilege safety account         |
| SAFETY_GATEWAY_PASSWORD  | Secret            | Safety submission/tracking gateway               |
| ENABLE_DEMO              | Server            | Explicitly enables isolated demo login           |
| DEMO_PASSWORD            | Secret            | Password shared only by synthetic demo accounts  |
| GEMINI_API_KEY           | Secret, optional  | Server-only Gemini key                           |
| GEMINI_MODEL             | Server, optional  | Supported Gemini model ID; no hard-coded default |
| NODE_ENV                 | Server            | `development` or `production`                    |
| PORT                     | Server            | Cloud Run supplies this; defaults to 8080        |

Saarthi uses translated deterministic text guidance if Gemini is disabled or fails. Browser speech availability varies by installed Tamil/Hindi voices; the complete text remains visible.

## Tests

```powershell
npm run typecheck
npm test
npm run test:rls
npm run build
npm run test:e2e
npm audit
```

Keep both dev servers running for browser tests. Windows tests use installed Chrome; elsewhere install Playwright Chromium with `npx playwright install chromium`. Override with `PLAYWRIGHT_CHANNEL` or `TEST_BASE_URL` as needed. Browser workflows append clearly marked synthetic QA shifts/events; they do not delete audit history. Do not use them on production employee data. `test:rls` exercises live Auth and RLS using isolated synthetic accounts; failures are real failures, not skipped assertions.

For sandboxed Windows environments, Vitest may require execution outside the sandbox due to a temporary-file rename restriction. The initial blocked run executed zero tests and is not counted as passing.
