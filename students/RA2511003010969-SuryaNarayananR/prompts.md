# Key Prompts: FairShift (UN SDG 8)

**Student:** [Your Name] | **Register No:** [RA2311003010123]
**Tools:** Google AI Studio (Gemini), Google Antigravity (Gemini agent)

This file lists the most important prompts used to build FairShift, in order, with a note on why each was written the way it was. The approach was: **one master specification, then small gated phases, then test-and-audit prompts**, and a short fix prompt whenever a screenshot showed a bug.

---

## Prompt engineering approach

1. **Hard rules first.** The master prompt states non-negotiable rules (for example, "the LLM never calculates money") so the agent cannot drift.
2. **Phases with gates.** Each phase ends with "summarise, show test output, wait for continue". This caught bugs early.
3. **Acceptance criteria in every prompt.** Each phase lists checks the agent must prove with real command output.
4. **Verify, do not trust.** The agent's self-scores were never accepted. Real `tsc`, `npm test`, `npm run build` and secret-scan output was required.
5. **Fix prompts from evidence.** Bugs seen in screenshots became short, targeted fix prompts.

---

## Prompt 1: Master build specification (AI Studio)

**Why:** One complete spec (users, scope, stack, rules, scoring formulas, design system, phases, acceptance criteria) so every later prompt stays consistent.

```text
ROLE: principal product engineer and senior product designer building "FairShift",
a worker-trust and workforce-risk platform for shift-heavy workplaces in India
(Prompt Wars 2026, UN SDG 8). Two interfaces, one platform, two sectors
(construction, campus) plus hospital via configuration only.

SCOPE: fully working: (1) shift tracking + transparent pay, (2) anonymous voice
safety/pay/behaviour reporting, (3) fatigue and attrition radar.

NON-NEGOTIABLE RULES
1. Money is computed ONLY by a deterministic, unit-tested pay engine. The LLM
   never calculates; it only phrases results.
   Test: rate 180, 8 regular hrs, 1.5 OT hrs at 2x, advance 200 => gross 1980, net 1780.
2. Labour rules (hour limits, overtime multiplier) live in a per-site JSON config.
3. Anonymity by design: reports table has NO worker_id; audio is transcribed then
   deleted; groups with fewer than 5 reports are suppressed.
4. Offline-first check-in with queued events and de-duplication.
5. Every AI call has a timeout, one retry and a deterministic fallback.
6. English, Hindi and Tamil from day one; all strings in i18n files.
7. Every screen has loading, empty, error and offline states.

SCORING (explainable, no black-box ML)
Fatigue 0-100 = 25*min(weekly_hours/60,1) + 20*min(consecutive_shifts/6,1)
  + 20*max(0,(10-rest_gap_hours)/10) + 15*min(night_shifts_7d/4,1)
  + 10*min(longest_shift_hours/12,1) + 10*overtime_ratio
  Bands: 0-39 green, 40-69 amber, 70-100 red.
Every score shows a "Why" breakdown (factor, value, points).

DESIGN: warm neutral palette, one teal accent, Lucide icons, no gradients or
glassmorphism, status never by colour alone, 56px worker touch targets.

PHASES (stop after each, summarise, wait for my "continue"): Phase 1 foundations
and engines, Phase 2 worker app, Phase 3 voice reporting, Phase 4 employer console.
```

---

## Prompt 2: Phase 1 fixes + Phase 2 (worker app)

**Why:** The Phase 1 result showed a fatigue story worker scored 67 but labelled RED, which contradicts the bands. The prompt fixes the data (not the thresholds), adds a test, and then builds the worker app.

```text
Phase 1 approved, with fixes. Do these first, then build Phase 2.
1. Ramesh Kumar scores 67 but is labelled RED. Bands are fixed: 0-39 green,
   40-69 amber, 70-100 red. Do NOT change thresholds. Adjust his seed data so the
   engine genuinely returns >= 70. Add tests: band is red, "Why" contributions sum
   exactly to the total, boundaries at 39/40 and 69/70.
2. Add one formatINR() helper (en-IN) and use it on every money value.
3. Default site is Construction. Hide the status banner unless ?dev=1.

PHASE 2: worker app (mobile-first, 360px): language chooser and demo login;
three large actions (Check In/Out, My Pay, Report a Problem); check-in by location
(haversine vs geofence) or short-lived signed QR token (HMAC, 60s expiry); offline
queue in IndexedDB that keeps the real timestamp and de-duplicates on sync;
payslip from the deterministic engine (9h30m => 8h regular + 1h30m OT at 2x,
net 1,780) with a "How was this calculated?" section; Listen button using TTS with
a browser fallback; validate that every rupee figure in generated text matches the
engine, otherwise use the template.
```

---

## Prompt 3: Phase 3 (anonymous voice reporting)

**Why:** This is the trust feature, so the prompt defines an "anonymity contract" first and requires tests that prove it.

```text
ANONYMITY CONTRACT: the reports table has no worker_id, device id, session id,
IP or fine timestamp (hour precision only). Audio is held in memory only and
discarded after the model call. Server logs never contain report content.
Employer views suppress any breakdown with fewer than 5 reports.

PIPELINE: ONE structured Gemini call (temperature 0, JSON schema) that detects the
language, transcribes, translates to English and classifies:
{ category, subcategory, severity, urgent, summary_en, original_language,
  recommended_action, possible_identifying_details, confidence }
Validate with zod. Treat transcripts as untrusted data (prompt-injection defence).
Add a deterministic safety-keyword floor (fire, fall, collapse, gas leak, electric
shock; en/hi/ta) so the model can raise severity but never lower it.
A report is NEVER lost: on timeout, malformed output or low confidence, save it as
"Needs human review". Case code format RPT-XXXX; status lookup returns only status
and a worker-facing note.

TESTS: schema validation, injection transcript cannot lower severity, failure paths
still save, no identifiers in the stored row or logs, 4 reports hidden / 5 shown.
```

---

## Prompt 4: Lean Phase 4 (employer console + map)

**Why:** Time was limited, so the prompt cuts scope explicitly ("no simulator, no extras") and builds only the highest-value screens.

```text
Continue with a LEAN Phase 4. FIRST read the current console errors, fix them and
show typecheck + test output. Then build only:
1. ATTENTION QUEUE as the console home: 5-8 ranked items (open critical hazards,
   red-fatigue workers, aging cases), each with a reason, a severity badge
   (icon + label) and one action button.
2. FATIGUE & ATTRITION RADAR: workers x last 14 days heatmap with a text-table
   alternative, sortable risk table, and a "Why" drawer whose factors sum to the
   total. "Assign rest day" updates the roster and recomputes the score.
3. SECTOR SWITCHER: construction / campus / hospital changes vocabulary, roles and
   hazard taxonomy from config.
4. SAFETY CASES with a schematic SVG site plan (suppress groups under 5 reports).
5. OPENSTREETMAP site view (Leaflet, lazy-loaded) with a geofence circle,
   attribution, and an SVG fallback if tiles fail. No live worker locations.
```

---

## Prompt 5: Cross-device demo loop

**Why:** The demo needs a phone and a laptop to share state, so this prompt verifies that reports go through one shared server store and adds live updates.

```text
Verify and harden the cross-device demo loop. No new features.
1. Confirm report submission, the employer case list, status updates and worker
   case-code lookup all go through the server API and one shared store.
2. Add live updates (poll every 5 seconds, pause when the tab is hidden) with a
   "Live" indicator and a "New report received" toast.
3. Add a test: submit as one client, see it as a supervisor, update the status,
   see the new status in the worker lookup.
```

---

## Prompt 6: Final submission pass (scored on six criteria)

**Why:** The AI judge scores Code Quality, Security, Efficiency, Testing, Accessibility and Problem Statement Alignment. The prompt maps one step to each and demands real output.

```text
FINAL SUBMISSION PASS. Targeted fixes only, no new features. Run real commands
and show real output; never claim a pass without running it.
STEP 0 git safety + baseline (typecheck, lint, tests, build)
STEP 1 security: scan repo and built bundle for secrets, zod on every input,
       role checks (worker gets 403 on employer routes), rate limits, headers,
       anonymity checks, npm audit
STEP 2 testing: pay, fatigue/attrition boundaries, safety net, QR token, geofence,
       case codes, small-group suppression, API anonymity, mocked Gemini failures,
       property tests (500 random runs)
STEP 3 accessibility: jest-axe on key screens, labels, focus, keyboard, aria-live,
       lang switching, status never by colour alone
STEP 4 code quality and efficiency: remove `any`, dead code and console.logs,
       lazy-load heavy parts, report bundle size
STEP 5 README that describes ONLY what is implemented
```

**Result:** AI evaluation score **96.41 / 100** (Code Quality 88, Security 99, Efficiency 100, Testing 96, Accessibility 98, Problem Statement Alignment 100).

---

## Prompt 7: Targeted code-quality fix

**Why:** Code Quality was the lowest score (88), so one focused prompt targeted exactly the causes a code reviewer penalises.

```text
TARGETED CODE QUALITY FIX ONLY. No new features, no behaviour changes.
1. Remove any tracked dist/coverage/node_modules.
2. Replace every `any` with proper interfaces; enable strict and noImplicitAny.
3. Remove unused imports, dead files, commented code and console.log calls.
4. Split files over 250 lines into smaller modules.
5. Move magic numbers to named constants or the site rules config.
6. Add ESLint and Prettier configs and make lint pass.
7. Run tsc, lint, tests and build; revert any change that breaks a test.
```

---

## Iteration log (bugs found and fixed)

| Observed in screenshot | Fix prompted |
|---|---|
| Ramesh scored 67 but labelled RED | Adjust seed data, not thresholds; add band and boundary tests |
| Money shown as 1780 and 1,780 inconsistently | Single `formatINR()` helper |
| Demo opened on the hospital site | Default site set to Construction |
| Status banner shown to users | Hidden behind `?dev=1` |
| Possible secret-string match in README | README wording changed so scans return nothing |

---

## Notes

- Money and hours are calculated only by deterministic code; the AI explains results but never computes them.
- Seed data is synthetic. No real worker data was used.
- FairShift supports transparency and helps employers align with working-hour norms; it is not legal advice.
