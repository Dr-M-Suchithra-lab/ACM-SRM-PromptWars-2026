# NYAVERIS AI

**Fairness You Can Trace. Trust You Can Prove.**

PromptWars × ACM SRM Student Chapter 2026 · Solo submission  
**AFTAN FAIZ · 192425004**  
Branch: `192425004-AFTAN-FAIZ` · Folder: `students/192425004-AFTAN-FAIZ/`  
[Organizer's required README format](https://github.com/Dr-M-Suchithra-lab/ACM-SRM-PromptWars-2026/blob/main/README.md)

## 1. Problem Statement

**FairShift — Decent Work Platform** is the original challenge title supplied for this project, retained here as historical problem-statement information. The project addresses opaque wages, workplace safety concerns and insufficient rest, aligned with **UN SDG 8 — Decent Work and Economic Growth**.

The complete organizer-issued wording is not present in the public organizer README or this submission's supplied evidence. The description above is the implementation's scope, not an invented verbatim problem statement; the official full text/link remains to be supplied if the organizer requires it.

## 2. Our Solution

NYAVERIS AI connects worker and employer dashboards to Supabase Auth and PostgreSQL.  
**Fairness Twin** compares expected and recorded earnings using deterministic integer-paise calculations and saved pay-policy snapshots.  
**ProofLoop** records payroll reviews, employer responses and worker confirmations in transactional audit history.  
**SafeSignal** provides concern reporting and secret-based tracking; **RestGuard** distinguishes overlapping shifts from insufficient rest and offers schedule previews.  
**Saarthi AI** provides English, Tamil and Hindi workplace assistance, relevant navigation and browser speech controls, with optional server-side Gemini and reliable deterministic guidance.


## 3. Tools Used

- **OpenAI Codex** for engineering and testing; genuine development excerpts are retained in [prompts.md](prompts.md).
- **React 19, TypeScript, Vite, Tailwind CSS 4, React Router, Radix UI and Lucide** for the existing accessible interface.
- **Node.js 24, Express 5 and Zod** for validated APIs and serverless startup.
- **Supabase PostgreSQL and Supabase Auth** for the sole application database, authentication, RLS, guarded transactional RPCs and shared rate limiting.
- **Google Gen AI SDK** for optional Gemini explanations; live generation remains unverified after provider HTTP 400 responses.
- **Vitest, Supertest, Playwright and axe-core** for regression, database-boundary, accessibility and browser checks.
- **Vercel and GitHub** for the existing deployment and versioned submission.

Dependency versions are pinned in `package.json` and `package-lock.json`. See [architecture](docs/ARCHITECTURE.md).

## 4. How to Run

Use Node.js 24 and npm. From this participant folder:

```powershell
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
# Configure the existing project's approved values privately in .env.
npm run dev
# In a second terminal in this same folder:
npm run dev:web
```

Open `http://127.0.0.1:5173`. Vite proxies `/api` to Express on port 8080. Configure `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and the existing gateway credentials privately. Use `ENABLE_DEMO=true` only with the authorized synthetic demo accounts. Optional AI uses a backend-only `GEMINI_API_KEY`; the existing private alias is supported, and `GEMINI_MODEL` overrides the owner-selected server default. Never put secrets in `VITE_*`, screenshots, prompts or Git.

**Existing hosted project safety:** use only `vkkjuopfidvfhzsqzius`. Do not run provisioning, seed, reset or blanket migration-push commands against it. Do not create another project. Keep `ENABLE_SAAS` disabled until the approved migration and backup/restore checks pass. The optional performance migration is not automatically authorized. Follow [migration review](docs/MIGRATION_REVIEW.md), [private backup/restore steps](docs/OPERATOR_BACKUP_RESTORE.md) and [SaaS rollout](docs/SAAS_ROLLOUT.md).

Run checks:

```powershell
npm run typecheck
npm test
npm run build
npm run check:security
```

For the **isolated** SQL and complete browser journey, first install the documented optional test runtime. This does not replace Supabase as the application database:

```powershell
npm install --prefix .local/saas-db --no-audit --no-fund --ignore-scripts @electric-sql/pglite@0.3.14
node scripts/test-saas-database.mjs
node tests/migration-upgrade.mjs
npx vitest run --config tests/functional.config.ts
```

Do not point the complete mutating browser suite at production. Browser tests use Chrome on Windows; install Playwright Chromium where required. The synchronization command `node scripts/sync-submission.mjs --check` is run from the **application repository root**, which contains both local copies.

## 5. Demo Link

**[Open NYAVERIS AI](https://nyaveris-ai.vercel.app)**

Real signup/login, account recovery and SaaS onboarding code are implemented. **Hosted business creation, employee management and invitations remain gated** until the approved SaaS migration's verified-backup prerequisite is satisfied. New businesses do not inherit demo employees. AI never calculates authoritative wages or changes business records.

Use **Explore worker demo** or **Explore employer demo** for the existing synthetic construction/healthcare workspaces; passwords are not published. These records are demonstrations, not real employment or legal determinations.

Current verification: **203 unit/API tests and 40 isolated browser tests passed** in the activation audit. Both production builds passed. A fresh approved synthetic signup was accepted and its verification email arrived with the production callback; the confirmation link/session was not completed because browser control was stopped. Existing live health and protected-route checks are recorded in the audit; genuine email verification, password recovery, Google consent, invitation receipt, physical voice output and complete hosted new-business acceptance are not claimed from local tests.

Current external blockers: a verified restorable backup and the pending SaaS migration; Google OAuth and invitation-sender configuration; Gemini provider rejection; remaining inbox/device acceptance. See [activation evidence](docs/ACTIVATION_2026-11-01.md). The portable Cloud Run container remains available, but no Cloud Run deployment is claimed. The recorded original challenge's Cloud Run hosting requirement is not satisfied by Vercel alone.

## 6. Key Prompts

These short **verbatim excerpts** come from the preserved [prompt history](prompts.md); they describe requested work, not proof of completed external integrations:

1. **Implementation:** “You must write actual working code in the project repository.” — [initial development](prompts.md#1-initial-application-development)
2. **Database:** “Use Supabase PostgreSQL as the database.” — [Supabase integration](prompts.md#2-supabase-integration)
3. **Fairness Twin:** “Represent money using integer paise rather than floating-point currency values.” — [calculation rules](prompts.md#4-fairness-twin)
4. **ProofLoop:** “Every important event in a workplace dispute must have a traceable history.” — [audit workflow](prompts.md#5-proofloop)
5. **SafeSignal:** “Store only a secure hash of the access token.” — [privacy requirements](prompts.md#6-safesignal)
6. **Saarthi:** “Integrate Google Gemini meaningfully.” — [multilingual assistance](prompts.md#8-gemini-and-saarthi-ai)

The required folder contains this README, complete `src/` and backend/configuration, authentic `prompts.md`, and [genuine screenshots](screenshots/README.md). Existing screenshots and prompt history are preserved. [File manifest](docs/FILE_MANIFEST.txt).

The organizer's instructions require a pull request to record submission time. No PR is created automatically; updates stay on the existing participant branch and inside this folder.
