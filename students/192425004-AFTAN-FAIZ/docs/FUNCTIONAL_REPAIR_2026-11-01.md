# NYAVERIS AI — functional repair audit, 1 November 2026

Scope: repair the existing Saarthi/RestGuard workflows, preserve business records and the existing application, and verify all available application suites. Source and tests are synchronized with the application repository. This report distinguishes local SQL/Auth-adapter proofs from real hosted services.

Update after initial publication: the owner privately added Gemini configuration. A fresh production inventory shows `GEMINI_MODEL` and a secret named `saathi_api`, rather than `GEMINI_API_KEY`. The backend now accepts that existing server-only alias, preferring the canonical name, and the public config exposes only a boolean. No secret was read or changed. The configured model remains `gemini-3.8-flash`; Google's exact model page lists structured-output support and the existing GenerateContent JSON parameters are documented. The optional temperature override was removed. A redeployment and genuine authenticated generation check are required; the historical missing-configuration observations below describe the earlier deployment.

Initial live browser run: six passed and two failed (workspace load exceeded the assertion's five-second limit; the legacy RestGuard test implicitly selected the wrong stored shift). The assistant's load assertion now allows fifteen seconds, and the scheduling test explicitly selects its intended synthetic shift without mutating it. All five affected isolated browser cases pass. RestGuard now explicitly explains when no preceding shift is recorded and includes authorized employee names beside warning dates. The full dependency audit reports zero vulnerabilities. Exact final publication/live results are recorded in the handoff.

## Confirmed causes and repairs

### Saarthi AI

Production environment inventory contains neither `GEMINI_API_KEY` nor `GEMINI_MODEL`. No real Gemini request can be authenticated from that deployment. There is no evidence of a bad key, unsupported model, quota failure or timeout in production: missing configuration is the confirmed cause. Do not substitute a guessed model/key or call this a successful live integration.

Previously, only an explicit pay shift supplied record context; other topic buttons received generic guidance. Suggested actions were plain text. The repair adds:

- A labeled, bounded question input, follow-up history, clear action, independent loading/error state, exact-request retry and real next-action buttons. User/organization/language changes invalidate requests and clear prior conversation. History is temporary browser memory, not a new database or local-storage conversation store.
- Supported questions about pay differences, worked overtime, last five shifts, rest warnings, case status and safety reporting. English/Tamil/Hindi intent matching and translated controls/guidance are provided. Off-topic input gets a scope explanation rather than a fabricated answer. This is a workplace assistant, not unrestricted general-purpose chat.
- Server-side authorized record reads. Workers receive their own shift/pay/case facts. Protected administrators receive organization scheduling/case summaries or can explicitly request an authorized shift. Supplied organization IDs are checked against protected memberships; selected shifts are checked again. Client-supplied context, roles and history are rejected.
- Deterministic, integer-paise expected/recorded/difference facts, policy snapshots and available employee rates. Missing payroll is distinguished from recorded zero. Unconfirmed estimates are labeled. Worked overtime excludes future/unconfirmed shifts; recent-shift requests exclude future schedules. Summaries are bounded to five matching shifts and state how many were considered.
- Actual case status counts and RestGuard counts/interval examples. Case reasons, employee/organization IDs and names, location strings, report bodies, anonymous credentials and raw questions are excluded from provider prompts. Raw questions select only a bounded intent. A second schema projection strips unexpected fields before Gemini.
- Structured provider output validation and deadlines with timer cleanup. Gemini supplies qualitative text; output containing digits or currency symbols is rejected, and authoritative numeric facts are appended by the application. This is defense against invented wage figures, not a guarantee of the truth of every possible natural-language assertion.
- Sanitized server diagnostics for missing key/model, provider credential/model/quota failures, timeouts and invalid output. Logs do not include raw provider errors, prompts, questions, identifiers or credentials. Ordinary users get translated retry guidance, not technical diagnostics. All navigation labels/paths are determined by the application, never by Gemini.

Fallback remains clearly labeled as fallback and is now grounded in current authorized record facts, with a working next action. It is not represented as live Gemini. The live SDK credential/model path remains BLOCKED until configured and tested genuinely.

### RestGuard

Read-only hosted inspection found 18 shifts, four QA-labelled locations and 21 overlapping same-worker pairs. These stored records were not deleted or reset. Distinct persisted overlapping shifts remain genuine scheduling conflicts even if synthetic QA created them.

The previous engine emitted a negative `short_rest` duration for overlap. It now emits `overlap` with the actual shared interval and separate insufficient-rest warnings with nonnegative gaps. Machine-readable minute/policy fields support factual and localized explanations. Repeated references to the same persisted shift ID are deduplicated; different shift records are retained. Seven-day overtime and consecutive-day policies remain deterministic, configured scheduling signals rather than legal conclusions.

The UI groups warnings by worker/type, preserves an expandable list of affected shifts, and shows meaningful dates/times instead of QA location labels. A real Review schedule action opens authorized shift management. Shift selection makes the what-if target explicit. What-if now checks conflicts against the proposed interval, distinguishes conflicts from rest gaps and never displays negative rest as a rest duration. Nothing is saved without the existing explicit authorized confirmation; confirmed/payrolled edit protections remain intact.

## Current audit coverage and executed checks

The refreshed [interaction inventory](INTERACTION_INVENTORY_2026-11-01.json) covers the current JSX route/control templates, event wiring and targets. It is a source inventory, not a claim that every possible record permutation was exercised. Existing landing/policy/skip anchors have real section targets; no empty placeholder anchors or empty click handlers were identified. Original submission history/screenshots and older audit artifacts are preserved.

| Check | Result |
| --- | --- |
| TypeScript | PASS |
| Unit/API/native Node suite | 178 PASS, 0 final failures, 13 files |
| Native unbundled serverless entry | PASS; API health/config and unauthenticated boundary |
| Application/submission production builds | PASS; existing upstream Zod annotation warnings only |
| Full isolated browser suite | 38 PASS, 0 FAIL, all original cases preserved |
| Final affected assistant/speech/RestGuard browser subset | 12 PASS, 0 FAIL after final changes |
| Submission source/browser secret scan | PASS; configured values and credential signatures absent |
| Isolated PostgreSQL/RLS workflows | 53 assertions PASS |
| Seeded upgrade/forced rollback | 47 assertions PASS; no hosted requests |
| Hosted SELECT-only RLS | 11 assertions PASS; no business records changed |
| Backend relative-import audit | 20 imports checked, none incompatible |
| Synchronization | 85 shared files match |

The connected local journey exercises signup/login/callback/recovery adapters, transactional owner/business creation, new empty dashboards, employees, invitations/rotation/revoke/acceptance, role/tenant denials, settings, shifts, policy/payroll/history, ProofLoop responses/worker confirmation, anonymous safety/tracking and RestGuard preview/save. It runs actual React/Express/SQL with synthetic Auth and data. It does not establish real verification mail, Google consent, invitation receipt, physical voice quality or new-business hosted persistence.

Mutation browser cases remain isolated. The new overlap persistence regression explicitly refuses to create hosted shifts. Live acceptance for the new UI uses read-only existing synthetic workspaces. Routine requests consume the existing shared throttle; no business row, Auth setting, provider secret, seed or migration was changed by the repairs.

The root security command's existing two-local-branch rule is not bypassed: `main` and `192425004-AFTAN-FAIZ` are preserved. Submission and exact publication content secret/bundle scans are used alongside that accurately reported repository-state limitation. No new dependency, branch, worktree, project, PR, force push or destructive cleanup was introduced.

## External blockers and exact next steps

1. **Gemini — BLOCKED:** privately configure an approved `GEMINI_API_KEY` and an available generation-capable `GEMINI_MODEL` in the existing Vercel project. Verify the selected model through Google's authenticated model metadata/listing, redeploy, then require a genuine structured response with `source=gemini`. Never paste the key in chat/Git or infer successful generation from a configuration boolean. See [Google model documentation](https://ai.google.dev/gemini-api/docs/models) and [structured output documentation](https://ai.google.dev/gemini-api/docs/structured-output).
2. **Hosted SaaS migration — BLOCKED:** `saas_action` is still absent. The approved SQL hash, preservation rules and restorable-backup condition remain in [MIGRATION_REVIEW.md](MIGRATION_REVIEW.md). No migration or optional performance SQL was applied; `ENABLE_SAAS` must remain false until prerequisites pass.
3. **Google/email — BLOCKED:** Google provider/flag remain disabled. Real signup verification/recovery and invitation inbox delivery require approved private provider/sender settings and genuine acceptance, as documented in [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md). Local mocks/provider acceptance are not receipt proof.
4. **Complete hosted owner-to-employee SaaS journey — BLOCKED:** run only after the approved migration, required provider setup and controlled rollout, including two businesses and direct tenant/role denials. Existing demo reads are not new-business acceptance.
5. **Device speech — MANUAL/BLOCKED:** complete [VOICE_DEVICE_CHECKLIST.md](VOICE_DEVICE_CHECKLIST.md) on Windows, Android Chrome and iPhone Safari. Automated speech adapters prove controls/fallback, not audible output.

## Publication safety and recovery

Application target remains `AFTAN18/NYAVERIS-AI` main. Organizer target remains only `192425004-AFTAN-FAIZ` and `students/192425004-AFTAN-FAIZ/`. Preserve independent histories and repository-specific documents. Changes stay compatible with the current foundation schema and disabled SaaS flag. The native Node regression protects the ESM runtime fix. Confirm actual deployment health/config/401 responses before promotion where supported, inspect production aliases and runtime logs, and retain the verified previous Vercel deployment for rollback. Never use a destructive database rollback to repair frontend/backend deployment problems.

This report records implementation and local audit evidence. Exact final commit/deployment links and live repair checks are recorded in the final handoff; no full real-user SaaS readiness is claimed while the above blockers remain.
