# Key prompts used to build FairShift

FairShift was built with **Claude Code (Sonnet 5.5, high effort)**. I wrote the prompts with Claude's help, ran them in batches, tested each batch in the browser and with `npm test`, and only then moved on. I never let the model push or deploy; I did that myself.

> The first prompt is condensed from the original brief. The later prompts are reproduced as sent.

---

## 0. Initial build brief (condensed)

Goal: build **FairShift**, a decent-work platform for employee-intensive organisations, for the Prompt Wars × ACM SRM hackathon (SDG 8).

- Two interfaces: a **worker app** (phone-first, low-end devices, voice and icons, regional languages) and an **employer/admin app**.
- At least 3 working features and 2 industries (construction and a college).
- Stack: Node 20, Express, vanilla HTML/CSS/ES modules, no framework and no build step.
- All data access through a repository interface (in-memory store first) so the database can be swapped later. Multi-tenant by `orgId`. Config-driven sectors.
- Features: QR / typed-code / "I'm at work" check-in with automatic overtime; explained payslips in integer paise with PF and ESI and read-aloud; safety and complaint reports with icons, voice and an anonymous tracking code; anonymous feedback with k-anonymity of 3; skill passport; fatigue alerts; explainable attrition risk; English, Hindi and Tamil; installable PWA.
- Security: helmet and CSP, rate limiting, signed httpOnly cookies, input validation, per-organisation authorisation, no secrets in the repo.
- Quality: `node:test` tests for all logic, a README, `.env.example`, a Dockerfile for Cloud Run.

---

## Shared rules (pasted at the top of every batch)

```
You are working on FairShift (Node 20, Express, vanilla HTML/CSS/ES-module JS, no build step). First read the repo structure, README, src/config, src/services, src/routes, the repository interface, public/worker, public/admin, public/i18n and tests, and follow the existing patterns and naming. Do not introduce frameworks.

Rules for all work:
- Money is integer paise everywhere. Multi-tenant by orgId, enforce per-org authorization on every new route. Keep the two separate cookies (fs_worker, fs_admin) and the X-FairShift-App header check. Validate all input, return the existing JSON error shape, never leak stack traces.
- Anonymity guarantees stay intact (anonymous reports and feedback never store identity; feedback summaries keep k-anonymity of 3+).
- Everything user-facing is added to en, hi and ta i18n files. Keep the UI accessible: not colour-only status, aria labels, large touch targets, read-aloud where payslips have it.
- Add node:test tests for all new logic. Existing tests must keep passing. `npm test` and `npm audit` must be clean. A fresh clone with only .env.example copied to .env must still start with no credentials.
- Update .env.example and README for anything new. Do not commit secrets.
- Do NOT run git commands, gcloud, or any deploy. Put needed deploy commands in the README instead.
- At the end print: files changed, new env vars, test results, and how to manually try each new feature.
```

---

## Batch 1: foundation (Firestore + hospital sector)

```
Task A: Firestore persistence behind a flag.
- Add DATA_STORE=memory|firestore to env loading (default memory) and .env.example. Add @google-cloud/firestore.
- Implement a Firestore adapter that satisfies the existing repository interface exactly, so no route or service changes. Scope every document by orgId. Use Application Default Credentials (works on Cloud Run with no key file); optional GOOGLE_CLOUD_PROJECT.
- Seeding: in firestore mode, seed demo orgs/workers only if the database is empty (idempotent, safe to restart and run on multiple instances).
- Tests must not need credentials: run the shared repository contract tests against the memory store, and against the Firestore adapter using a fake or the emulator only when FIRESTORE_EMULATOR_HOST is set (skipped otherwise).
- Handle Firestore errors gracefully (clear 503 JSON, logged server-side, no crash). Add a /health endpoint reporting the data store in use.
- README: a "Persistence" section with the commands to enable the Firestore API, grant roles/datastore.user to the Cloud Run service account, and set DATA_STORE=firestore, and note that max-instances can be raised once Firestore is used.

Task B: Add a third sector, "CityCare Hospital", purely through the existing sector config.
- Departments (ICU, Emergency, General Ward), night shifts, nurse and ward-staff roles, hospital-specific safety report categories (needle-stick, patient aggression, equipment fault, infection exposure), and stricter configurable fatigue rules (max consecutive night shifts, rest after night shift). Label values as configurable defaults, not legal claims.
- Seed 8-10 workers with realistic shift data, including a few fatigue and overtime cases, one-click demo logins for a nurse and for the hospital admin.
- Landing page shows three sectors. Both apps work for the new sector with all existing features, in en/hi/ta. Add tests that load all three sectors and run the core flows against each. If any code is sector-specific rather than config-driven, refactor it into config.
```

---

## Batch 2: pay fairness (compliance, disputes, Decent Work Score, demo reset)

```
Build these three features in this order.

1. Wage and overtime compliance check
- Add per-sector config: minimum daily or hourly wage (paise), overtime multiplier (default 2x), and a note field "configurable, verify against current state notifications".
- Payslip service returns a compliance object: status (ok, underpaid, review), expected vs paid in paise, and reasons[] in plain language (e.g. "10 overtime hours were paid at the normal rate").
- Worker payslip screen shows a clear "Paid correctly" or "Underpaid, here is why" badge (icon + text), with read-aloud support, in en/hi/ta. Admin gets a "Pay compliance" list of flagged payslips with the shortfall amount.
- Seed at least two flagged payslips so it can be demoed. Edge-case tests: exact minimum, rounding in paise, zero overtime, partial days.

2. Attendance dispute flow
- Worker can contest a day's attendance record: reason category (forgot checkout, wrong time, wrong site, other), the corrected times they claim, and an optional note. Rules: only records within the last 14 days (configurable), one open dispute per record, rate-limited, validated.
- Admin reviews a dispute queue: approve (applies the correction) or reject with a required note. Approval recalculates hours, overtime, fatigue flags and the payslip for that period.
- Every change writes an immutable audit entry visible to the worker. Worker sees a status timeline (submitted, under review, approved/rejected) in their app. Employers must never be able to edit hours without an audit entry.
- Tests: authorization across orgs and workers, recalculation correctness, double-approval protection, expiry window.

3. Decent Work Score (admin overview)
- A pure, deterministic service returning score 0-100 plus components with configurable weights: pay accuracy (compliance results), rest and overtime compliance (fatigue data), grievance handling (resolution time, overdue open ones), worker sentiment (feedback; only counted if k-anonymity of 3+ is met, otherwise shown as "not enough responses"), attendance accuracy (dispute rate and resolution).
- Return a band (Healthy, Needs attention, At risk), the top 3 drivers dragging the score down with a one-line explanation each, and a 14-day trend from existing daily data.
- Admin overview: a prominent score card with a gauge, component bars, the drivers list and the trend. Not colour-only, accessible text alternative. Show how the score is calculated in an expandable "How is this calculated?" panel.
- Deterministic fixture tests for each component and for the combined score, including missing-data cases.

4. Reset demo data
Add a "Reset demo data" feature: admin-only and only available when DEMO_MODE=true. Use a POST route with the same-origin/header checks and rate limiting, and require an explicit confirmation in the UI. It deletes only that org's data in the active store (memory or Firestore) and reseeds it with demo dates re-anchored to today. It must never touch other orgs. Add tests: works on both stores, refused when DEMO_MODE is off, refused across orgs. Document it in the README.
```

---

## Batch 3: offline-first worker app

```
Make the worker PWA work offline for key actions.
- Cache the app shell with the service worker so the worker app opens with no signal.
- Queue these actions in IndexedDB when offline or when the request fails: check-in, grievance/safety report, attendance dispute, anonymous feedback. Sync automatically on the 'online' event and via Background Sync where supported, with a manual "Sync now" button.
- Every queued item carries a client-generated idempotency key. The server must honor it so retries never create duplicates (add this to the relevant routes plus tests).
- Integrity: the client sends its capture timestamp; the server records both captured and received times, rejects timestamps in the future or older than 48 hours, and marks the record "recorded offline" so the employer sees a badge. QR check-ins are verified on sync, so a stale or invalid QR is rejected with a clear notification to the worker. Capture geolocation at capture time, not sync time.
- Anonymous items must not store or send any identity when queued or synced. Generate the anonymous tracking code client-side with crypto.getRandomValues (at least 80 bits), and have the server validate format and uniqueness. Document this tradeoff in the README.
- If sync gets a 401, keep the queue and prompt the worker to sign in again, without losing items.
- UI: an offline banner ("You're offline, 2 actions waiting"), per-item status (queued, syncing, synced, failed with retry), all in en/hi/ta, with large touch targets.
- Put queue logic in a pure module so it can be unit-tested with node:test (ordering, retry, dedupe, failure paths). Add server tests for idempotency and timestamp rules.

Reuse the new shared states, prefs and nav code for the offline banner and queue UI. Do not break the Judge tour. Keep all existing tests passing and add the new ones.
```

---

## UI polish pass (accessibility, states, Judge tour)

```
UI polish pass for FairShift. Keep all existing behaviour and tests passing.
- Worker app: add a large-text toggle (3 sizes) and a high-contrast toggle, remembered per device, meeting the existing WCAG tests. The dark theme already exists; keep it.
- Worker app: a bottom navigation bar with large icons and short labels (Home, Pay, Reports, Me), 48px+ targets, current page shown by icon and text, not colour alone.
- Every screen in both apps gets loading skeletons, friendly empty states, and error states with a retry button, in en/hi/ta.
- Landing page: a "Judge tour" button opening a skippable, keyboard-accessible 3-step guided overlay that uses the demo accounts and real screens: 1) worker contests a day, 2) employer approves it, 3) worker sees the corrected pay and audit trail.
- Consistent spacing, typography and button styles, no layout shift, works at 360px width.
- Add tests for the new logic (tour step state, preference persistence).
```

---

## Premium redesign

```
Premium UI redesign of FairShift (both apps, the landing page and the public passport page). This is a visual and layout change only: do not change business logic, API routes, data or the offline queue. Keep all 399 tests passing (contrast, i18n and precache tests included) and add tests for any new logic.

Direction: calm, premium, trustworthy. Generous spacing, soft layered surfaces, thin borders, subtle shadows, refined type. No blue anywhere.

1. Palette (design tokens only, values in one place):
- Dark: ink background #0B0E12, surfaces #12161C and #181D24, hairline borders, ivory text #F3EEE4, muted text #A8A398, accent champagne gold #D6B26A.
- Light: warm ivory background #FAF7F2, white surfaces, deep ink text #14110D, deep gold #8A6A1F for accent text and borders, gold fills with ink text.
- Status colours stay clearly distinct and never rely on colour alone: success green, warning orange, danger red, neutral info. Remove every remaining blue.
- Text must still meet WCAG AA (4.5:1), borders and focus 3:1, high-contrast mode 7:1. Update the existing contrast tests to the new tokens; never weaken the thresholds.

2. Typography: self-host variable woff2 fonts (no external CDN, CSP unchanged, font-display: swap). A refined serif for display headings (Fraunces) and a clean sans for body and UI (Inter). Get them from the @fontsource packages as dev tooling, copy only the Latin woff2 files into public/fonts, and do not make them runtime dependencies. Keep total font weight under about 300 KB. Hindi and Tamil use a system font stack. Add the fonts to the offline precache. Body text 16px minimum with comfortable line height.

3. Navigation (both apps):
- A fixed (sticky) top bar, and on phones a fixed bottom bar; neither scrolls away.
- Top bar: FairShift logo and wordmark on the left; on the right a light/dark theme toggle, the language selector and the sign-out/account control. The theme defaults to the system preference, is remembered per device and has no flash on load (reuse prefs-boot).
- Worker destinations Home, Pay, Reports, Disputes (attendance disputes), Passport, Feedback and Settings must all be visible without opening a menu. Desktop and tablet (900px and up): a fixed left sidebar with icon and label for all of them. Phone: a bottom bar with five tabs (Home, Pay, Reports, Disputes, Passport), and Feedback and Settings as labelled icon buttons in the top bar. Settings holds language, text size, high contrast and sign out. Remove the old Me tab. Targets 48px or larger; the current page is shown by icon, label and indicator, not colour alone.
- The admin app gets the same top bar, theme toggle and a fixed sidebar on desktop and a scrollable bottom bar on phones.

4. Logo: design an original FairShift mark as SVG (a simple geometric mark suggesting balance and a shift or clock; no existing brand imagery). Use it in the top bar, the landing page, the favicon, the PWA manifest icons and the public passport page, and add it to the offline precache.

5. Homepage readability:
- Landing page: a clear hero, three sector cards, two obvious sign-in buttons, the Judge tour button, and short readable copy.
- Worker Home: a clear hierarchy of greeting, then a prominent "today" status card with ONE primary action (I'm at work or I'm leaving work), then a quick-actions grid, then alerts as slim expandable cards (rest warnings stay visible but compact). No walls of text and no competing buttons.

6. Overall system: consistent spacing, radius, elevation and motion tokens (respect prefers-reduced-motion). Restyle buttons, inputs, cards, badges, tables (responsive, no horizontal overflow at 360px), dialogs, banners, skeletons and empty and error states to match. On the admin Overview, the Decent Work Score card should be the hero of the page. The Judge tour, offline banner and display settings must keep working in the new look.

Verify in the browser at 360px, 768px and 1280px, in light, dark and high-contrast modes, in English and Tamil. Update the README sections on navigation and display settings. Print the files changed and how to try it.
```

---

## Final README pass

```
Final README pass for the finalist review panel. Keep it accurate to the code. Required order: title, one-line pitch and SDG 8 link; live demo URL and a demo link; screenshots section using relative image links and alt text for docs/screenshots/; features grouped by worker, employer and platform; the three sectors; tech stack with one-line reasons; architecture as a Mermaid diagram; quick start from a fresh clone (npm ci, copy .env.example, npm start, open the URL); tests; env vars table; persistence (memory vs Firestore) with the Cloud Run commands; demo accounts and a 3-minute try-it flow including the Judge tour and Reset demo data; security measures; accessibility; Known limitations: payments are seeded (a payroll import in production), anonymity is best-effort, fatigue and wage rules are configurable demo defaults not legal advice, and npm audit reports 6 moderate advisories in transitive Firestore client dependencies that are not loaded at runtime and need an upstream release; project structure; license. Do not run git, gcloud or deploy.
```
