# Key prompts

My prompts, with typos fixed, grouped by stage. Under each is what it produced. The full commit history is at https://github.com/SushilRaj0177/shiftseal.

## 1. Strategy and architecture

> Build a high-trust, grounded SDG 8 app with a deterministic verification layer. The AI should understand, but code must decide, and nothing should reach a worker unchecked. Mobile-first, fast on low-end phones, one package, deployable on Cloud Run.

→ A single TypeScript codebase (React client, Express API, shared rule engine). Gemini only structures input into zod-validated schemas; every hour, rupee, deadline and severity comes from pure, unit-tested functions in `src/shared/rules/`. Architecture decision records in `docs/adr/`.

## 2. Proof that can't be faked

> A worker's record has to hold up in a dispute. Make check-ins impossible to forge or quietly edit, by either side.

→ Each check-in is signed on the phone with a device key (WebCrypto), bound to a rotating, signed gate QR token and a geofence, and appended to a per-worker hash chain. Edits are new signed entries with a reason; the worker is notified and can dispute. A daily fingerprint seals everyone's records. On Android: mock-location detection and Google Play Integrity verdicts.

## 3. Pay that explains itself

> Make every rupee explainable, with the law each line comes from. Support the overtime, leave and complaint laws of every major country we can, in the worker's own language.

→ Country packs for 12 countries (India, Japan, South Korea, China, France, Germany, Spain, Mexico, Brazil, Portugal, UK, US) with sourced statutes: overtime tiers, night and rest-day premiums, statutory leave, legal hour limits and the right complaint body. Legal notes written in all 10 supported languages.

## 4. Students and part-time retail workers

> What about students who work part time in stores, 7-Eleven-style convenience stores or cafés? Do it for them too.

→ A retail sector, student-visa hour caps counted across every workplace a student works at, and under-18 hour and night-work limits per country, raised as flags to the employer.

## 5. Voice, safety and voice of the worker

> Workers should be able to just speak, in their own language. Hazards must get a deadline, and feedback must be truly anonymous.

→ Hold-to-talk voice notes understood by Gemini on Vertex AI (audio never stored), hazard reports with photos, an AI severity that code can only raise, never lower, and response deadlines. Anonymous feedback is scrubbed of names and places and shown only in groups of five.

## 6. Design

> Throw some life in there; it shouldn't look like a template. Use multiple type faces for different kinds of text. Take references from real product design, and remove anything that looks AI-generated.

→ A navy-and-paper design system with Archivo headings, flat surfaces, sealed-record motifs, light and dark themes, an accessibility audit at zero issues on 64 screens, and a flat app icon with seasonal variants.

## 7. Production readiness and Google Play

> Make it production-ready: runs from a fresh setup, clear README, .env.example, error handling, screenshots. Then publish it on Google Play.

→ Fresh-setup verification, validated configuration, a schema on every API request, in-app account deletion, a privacy policy, a signed release bundle and a full Play Store listing in closed testing.
