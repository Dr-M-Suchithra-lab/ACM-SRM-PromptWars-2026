# NYAVERIS AI

**Fairness You Can Trace. Trust You Can Prove.**

PromptWars × ACM SRM Student Chapter 2026  
Participant: **AFTAN FAIZ** · Registration: **192425004**  
Submission name: **192425004 - AFTAN FAIZ**  
Submission branch: `192425004-AFTAN-FAIZ`  
Organizer repository: [ACM-SRM-PromptWars-2026](https://github.com/Dr-M-Suchithra-lab/ACM-SRM-PromptWars-2026)  
[Official submission instructions](https://github.com/Dr-M-Suchithra-lab/ACM-SRM-PromptWars-2026/blob/main/README.md)

## 1. Problem Statement

**FairShift — Decent Work Platform** is the original hackathon problem-statement title supplied by the participant. NYAVERIS AI addresses opaque wages, unsafe working conditions and insufficient rest through worker and employer workflows for construction and healthcare.

This supports **UN SDG 8 — Decent Work and Economic Growth**, particularly transparent remuneration, safer workplaces and worker participation in resolving concerns.

**Official wording pending:** the complete organizer-issued statement was not present in the supplied project or located in the public search. The paragraph above describes this implementation; it is not a verbatim official statement. Insert the organizer's exact text or link before final submission.

## 2. Our Solution

NYAVERIS AI connects worker and employer dashboards to Supabase Auth and PostgreSQL.  
**Fairness Twin** (the existing FairPay Twin workflow) compares expected and recorded pay using deterministic integer-paise rules.  
**ProofLoop** records transactional action history and payroll reviews through employer response and worker confirmation.  
**SafeSignal** provides anonymous concern reporting with secret-based tracking; **RestGuard** flags schedule risks and previews changes.  
**Saarthi AI** offers English, Tamil and Hindi guidance with optional server-side Google Gemini explanations and deterministic text fallbacks.

Implemented features include shifts, workforce/payroll views, policy versions, historical policy snapshots and separate synthetic construction/healthcare tenants. There is sign-in and provisioned membership; public registration is not implemented. AI does not calculate wages or change business records.

## 3. Tools Used

- OpenAI Codex: development prompts recovered from the existing project chat, plus submission preparation in this chat.
- React 19, TypeScript, Vite, Tailwind CSS 4, React Router, Radix UI and Lucide.
- Node.js, Express 5, Zod and the official Google Gen AI SDK (`@google/genai`).
- Supabase Auth and PostgreSQL: sole application database, RLS, protected RPCs and persistent rate limiting.
- Vitest, Supertest, Playwright and axe-core for automated checks.
- Vercel: recorded existing deployment; Git/GitHub: source and submission workflow.

Versions are pinned in `package.json` and `package-lock.json`. See [architecture](docs/ARCHITECTURE.md).

## 4. How to Run

Use Node.js 24 and npm. Run these commands **from this submission folder**:

```powershell
npm ci
Copy-Item .env.example .env
# Fill .env locally with your dedicated Supabase project values.
npm run dev
# In another terminal, from the same folder:
npm run dev:web
```

Open `http://127.0.0.1:5173`. Vite proxies `/api` to the backend on port 8080. Do not put server secrets in `VITE_*` variables. Runtime public configuration comes from `/api/config`.

**Connect a fresh dedicated synthetic Supabase project:** set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`; choose random demo/gateway passwords; temporarily configure `SUPABASE_SECRET_KEY` and run `npm run db:provision` to provision the fixed synthetic Auth identities. Apply **every** SQL file in `supabase/migrations/` in filename order, then apply `supabase/seed.sql` once and enroll the gateway using [setup](docs/SETUP.md). Remove the provisioning secret from runtime. Enable `ENABLE_DEMO=true` only for an isolated synthetic deployment. Never seed production employee data.

`SAFETY_GATEWAY_EMAIL` and `SAFETY_GATEWAY_PASSWORD` are needed for the safety gateway and shared database rate limits. Optional `GEMINI_API_KEY` plus `GEMINI_MODEL` enables live AI; otherwise guidance falls back to text. Existing synthetic email addresses are technical fixtures retained for compatibility.

```powershell
npm run typecheck
npm test
npm run build
# With both development servers running and a dedicated synthetic database:
npm run test:e2e
# Optional hosted tenant-isolation check (requires configured credentials):
npm run test:rls:readonly
```

Browser checks use Chrome on Windows; elsewhere install Playwright Chromium. The full existing E2E suite can append synthetic workflow records; use a dedicated test database. Submission-only read-only UI capture is available with `node scripts/capture-submission.mjs`; see its environment-variable comments. Current results and limitations are in [validation](docs/SUBMISSION_VALIDATION.md).

Vercel uses the included `vercel.json`, `api/` handler and Vite build. For a separate deployment, set the project Root Directory to `students/192425004-AFTAN-FAIZ` and configure runtime environment values privately; do not alter the existing live project. The portable Dockerfile is retained. The earlier project documentation records a Cloud Run hosting rule for the original challenge; Vercel alone does not meet that rule. Confirm current organizer requirements manually; no Google Cloud configuration is performed here.

## 5. Demo Link

[NYAVERIS AI on Vercel](https://nyaveris-ai.vercel.app)

This URL was found in existing project documentation and rechecked on 31 October 2026: landing page HTTP 200 with the exact NYAVERIS AI title, and `/api/health` HTTP 200 with healthy status. Screenshots are captured from the submitted source served locally against the existing synthetic backend, when available. No deployment changes are required.

## 6. Key Prompts

[prompts.md](prompts.md) contains genuine excerpts recovered from the existing development chat for the initial build, Supabase, worker/admin dashboards, Fairness Twin, ProofLoop, SafeSignal, RestGuard, Gemini/Saarthi AI, UI, Vercel deployment and testing/debugging. It records original message identifiers and distinguishes requested features from implemented functionality. Historical branding lines are omitted rather than rewritten inside quotations.

The submission includes `README.md`, `prompts.md`, complete application source/configuration, and genuine screenshots where capture succeeds. See [screenshots](screenshots/README.md) and [file manifest](docs/FILE_MANIFEST.txt).
