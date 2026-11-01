You are a senior full-stack engineer building a hackathon submission called
"FairShift – A Decent Work Platform for Employee-Intensive Organisations"
(SDG 8: Decent Work and Economic Growth). The output must be deployment-ready
on Google Cloud Run and will be scored by an AI evaluator on: Code Quality,
Security, Efficiency, Testing, Accessibility, and Problem Alignment. Human
judges score: real-world impact, SDG 8 relevance, inclusivity/ease of use,
technical implementation, feasibility/scalability.

=== PROBLEM ===
Large-workforce organisations (construction, colleges/schools, hospitals,
factories) run on paper registers, spreadsheets and WhatsApp. Workers don't
understand how pay was calculated, fear reporting complaints, safety hazards go
unreported, and their skills aren't recorded anywhere. Employers can't see who
is overworked, unhappy or likely to quit. Many workers use basic smartphones,
speak regional languages and have limited reading skills.

=== WHAT TO BUILD ===
A working prototype with TWO interfaces (Worker app, Employer/Admin dashboard)
that works for TWO industries out of the box: Construction Site and College.
Industry is a configuration (roles, shift patterns, wage rules, hazard
categories, terminology), NOT hard-coded. Seed realistic demo data for both.

Implement these features (all must be functional end to end):
1. Attendance & Shift Tracking: QR-code or geofence check-in/out; automatic
   calculation of regular vs overtime hours.
2. Transparent Payslip: itemised breakdown (base pay, overtime hours x rate,
   deductions, net) with plain-language "why this amount" explanation, in the
   worker's language, with a read-aloud button.
3. Grievance & Safety Reporting: text or voice (Web Speech API) submission,
   category + severity, optional photo, and a status tracker
   (Submitted -> Acknowledged -> In Progress -> Resolved). Admin can update
   status and add replies.
4. Anonymous Feedback: no worker ID stored with the feedback record. Use a
   one-way salted hash only for rate-limiting. Admin sees aggregated themes and
   sentiment, never identities. Enforce a minimum group size before showing
   breakdowns.
5. Skill Passport: portable digital record of training, certifications and
   experience, shareable via a public verifiable link/QR.
6. Fatigue Alerts: rule-based flags for excessive weekly hours, back-to-back
   shifts, and insufficient rest between shifts, shown to admins and gently to
   workers.
7. Employer Dashboard: attendance trends, open complaints/safety issues,
   feedback themes, fatigue flags, and an attrition-risk list (explainable
   rule-based score with the reasons shown).
8. Multilingual & Voice: English, Tamil, Hindi (i18n via JSON dictionaries,
   easy to add more); voice input and read-aloud; icon-heavy, low-literacy
   friendly UI.

Also add a short "Use Cases" page/section in the app and README explaining how
it applies to construction and colleges, and how to onboard a third industry
(hospital/factory) via config only.

=== TECH CONSTRAINTS ===
- Backend: Node.js 20 + Express. Frontend: lightweight, mobile-first PWA
  (vanilla JS or small framework; no heavy dependencies, target a fast load on
  low-end phones, under 200 KB JS gzipped for the worker app).
- Data layer: repository/adapter pattern. Default adapter = in-memory store
  loaded from seed JSON so the app runs with zero setup. Optional Firestore
  adapter selected via env var. Do not rely on local disk persistence
  (Cloud Run is stateless).
- Optional AI: Gemini via Vertex AI for summarising feedback themes and
  translating payslip explanations. MUST degrade gracefully to rule-based
  logic when no credentials exist. Never block core features on AI.
- Auth: simple role-based login (worker / admin) with signed session tokens;
  demo accounts documented in README. Hash passwords (bcrypt/scrypt).
- Listen on 0.0.0.0 and process.env.PORT (default 8080).
- Provide a Dockerfile (multi-stage, node:20-slim, non-root user, production
  deps only) and a .dockerignore. Include a /healthz endpoint.
- NO Vercel/Netlify config files or references anywhere.

=== SUBMISSION-RULE COMPLIANCE (HARD REQUIREMENTS) ===
- Entire repo MUST be strictly under 10 MB. No videos, datasets, node_modules,
  build artifacts or large images. Use SVG/emoji icons. Compress assets.
- Single git branch only (main). Do not create other branches.
- Zero secrets in code or git history: no API keys, tokens or credentials.
  Read all config from environment variables. Commit a .env.example with
  placeholders only, and a .gitignore covering .env, node_modules, logs.
  Use Google Secret Manager on Cloud Run for any real key.
- Final host is Google Cloud Run; include exact deploy instructions.

=== AI-EVALUATION QUALITY BAR ===
Code quality: clear folder structure (src/routes, src/services, src/repos,
src/middleware, src/config, public/, tests/), small single-purpose modules,
JSDoc on public functions, consistent lint/format config (ESLint + Prettier),
no dead code, meaningful names, centralised error handling.
Security: helmet, strict CORS, rate limiting, input validation (zod/joi) on all
endpoints, output escaping (no XSS), upload type/size limits, no sensitive data
in logs, dependency set kept minimal, `npm audit` clean where possible.
Efficiency: gzip compression, caching headers for static files, pagination,
no N+1 patterns, lazy-load non-critical frontend code, minimal dependencies.
Testing: unit tests (node:test or Jest) for overtime calculation, payslip
math, fatigue rules, attrition scoring, anonymity guarantees (assert the
feedback record contains no user identifier), i18n key coverage across all
languages, and API tests for core routes. `npm test` must pass.
Accessibility: WCAG AA contrast (4.5:1), full keyboard navigation with visible
focus states, semantic HTML, ARIA labels, skip link, large touch targets
(min 44px), respects prefers-reduced-motion, screen-reader friendly status
updates, never colour-only meaning.
Problem alignment: every feature maps to a stated worker or employer pain
point; list this mapping in the README.

=== DELIVERABLES ===
1. Complete working source code.
2. README.md: problem, solution, feature-to-pain-point table, architecture
   diagram (Mermaid), demo credentials, local run steps, test steps,
   multi-industry explanation, Cloud Run deploy commands, SDG 8 impact notes,
   and limitations/future work.
3. Dockerfile, .dockerignore, .gitignore, .env.example.
4. Tests and a passing `npm test`.
5. A DEPLOY.md with exact `gcloud` commands (enable APIs, `gcloud run deploy
   --source .` with --allow-unauthenticated, secret binding via
   --set-secrets).
6. A final self-audit checklist confirming each rule above, plus the repo size
   (run du) and `git branch` output.
7. A LinkedIn post draft (Problem -> Build & tools -> Solution fit).

=== WORKING METHOD ===
Work in phases and verify each before moving on:
 Phase 1: Plan the architecture and folder structure; show it, then proceed.
 Phase 2: Backend core, data layer, seed data, auth.
 Phase 3: Features 1-8 with tests alongside.
 Phase 4: Frontends (worker PWA + admin dashboard), i18n, voice, a11y pass.
 Phase 5: Dockerize, run the container locally, hit /healthz.
 Phase 6: Security and size audit, README/DEPLOY docs, final checklist.
Run the app and the tests yourself after each phase and fix failures before
continuing. Do not leave TODOs or placeholder logic. If a decision is
ambiguous, choose the simplest option that satisfies the rules above and note it in the README.