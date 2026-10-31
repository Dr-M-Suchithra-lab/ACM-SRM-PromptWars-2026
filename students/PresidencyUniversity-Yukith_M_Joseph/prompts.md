# Key prompts

FairShift was built in phases. Each phase was driven by one long, structured brief (300 to 1,000 lines each), followed by short follow-up instructions. The prompts below are **abridged**: the headings, goals and rules are quoted from the originals, and long requirement lists are shortened (marked `[…]`).

The initial foundation (project setup, routing, shared UI, page shells) was produced in **Google Antigravity**. Everything after that was built with **Claude Code (Claude Opus)** using the prompts below.

---

## 1. Master implementation directive (core product)

> **FAIRSHIFT — MASTER IMPLEMENTATION DIRECTIVE**
> *Prompt Wars 2026 | SDG 8: Decent Work and Economic Growth*
>
> You are the sole implementation engineer responsible for building FairShift into a complete, working, testable hackathon product. Your objective is to deliver the maximum amount of reliable functionality in the shortest practical time. Do not spend this phase polishing visual design. Build a clean, minimal, functional interface that can be visually upgraded in a separate phase without rewriting the application.
>
> **Non-negotiable execution rules**
> 1. Inspect the repository before making changes. […]
> 3. Preserve existing working code. Do not rebuild functioning infrastructure without a concrete reason.
> 5. Create a short implementation plan, then immediately start coding.
> 6. Implement end-to-end functionality, not merely page layouts, mock buttons, or static screenshots.
> 8. Prefer the smallest reliable implementation over excessive abstractions, unnecessary dependencies, or speculative features.
> 9. Keep functionality modular so a later UI redesign can replace presentation components without changing business logic or data contracts.
> 10. Do not claim a build, test, security check, or deployment succeeded unless you actually verified it.
>
> **Product mission.** FairShift is a workforce transparency and safety platform for employee-intensive organisations. It addresses four primary problems:
> - Workers cannot easily verify attendance, overtime, or wages.
> - Workplace hazards can be ignored or difficult to report safely.
> - Workers may fear retaliation when providing honest feedback.
> - Employers lack reliable visibility into attendance patterns, unresolved safety issues, and excessive working hours.
>
> It must support at least two industry configurations: **A. Construction** (site workers, contractors, daily shifts, overtime, site hazards) and **B. Educational institutions** (housekeeping, sanitation, security, maintenance and other campus support staff). Use shared business logic with configurable organisations, industries, shifts, and pay rules. Do not build two duplicated applications.
>
> **Architecture.** A React frontend, a small well-structured API layer, reliable persistence, shared validation schemas and typed domain models, automated tests for critical business rules. Keep business rules out of UI components. […]
>
> **Functional requirements:** A. Worker identity and access · B. Attendance and shift tracking · C. Transparent payslips · D. Workplace safety reporting · E. Worker feedback · F. Employer dashboard · G. Fatigue and excessive-hours warnings · H. Portable skill passport. Plus inclusion and accessibility, data model and persistence, security and privacy, API and routing. […]
>
> **Testing — the critical workflow must pass:** a worker checks in and out; the app calculates duration and overtime; the worker opens a payslip and sees a transparent breakdown; the worker submits a safety report; an administrator acknowledges and resolves it; dashboard summaries update; a worker cannot access another worker's private record; construction and educational-institution configurations both work.

---

## 2. V4.1: engineering audit, feature completion and release hardening

> **FAIRSHIFT V4.1 — FINAL ENGINEERING AUDIT, FEATURE COMPLETION & RELEASE HARDENING**
>
> Act as a senior software architect, full-stack engineer, application security engineer, QA lead and technical release auditor. Your objective is to independently inspect, validate, improve and finalize the existing FairShift V4.1 implementation. You have permission to fix defects, complete incomplete functionality, improve architecture where justified, strengthen security and add missing tests. Do not undertake the major visual redesign in this phase.
>
> Reported capabilities to verify: Money Jar; Agreed vs Worked vs Paid reconciliation; Labour Dispute Notice Generator; six-language localization (English, Kannada, Hindi, Tamil, Telugu, Bengali); NOAA/NWS Heat Index with NDMA-related guidance; mobile demo QR code; FairShift Proof; Safe Signal; Accountability Loop; multi-site attendance; workforce, payroll and payslip management; notifications. […]
>
> **Phase A** — independent repository audit and baseline reproduction.
> **Phase B** — security and trust engineering: authentication and sessions, FairShift Proof, Safe Signal, Accountability Loop, payroll and CSV security.
> **Phase C** — feature-by-feature validation: Money Jar, dispute notice generator, localization, heat-stress safety, mobile QR.
> **Phase D** — complete end-to-end workflow testing of every worker step (authenticate → check in/out → payslips → Money Jar → verify a receipt → download a proof bundle → generate a discrepancy notice → submit a confidential report → track it → change language) and every administrator step (provision workers → manage sites → correct a shift with a reason → generate payroll → export CSV → review Safe Signal → process reports → review accountability metrics).
> **Phase E/F** — reliability, deployment readiness and submission documentation.

---

## 3. V4.2: complete mobile-first UI/UX transformation

> **FAIRSHIFT V4.2 — COMPLETE UI/UX TRANSFORMATION** (mobile-first redesign)
>
> Workers must be able to: understand what they are owed; verify what the organization recorded; report unsafe conditions without fear of exposure; see what happened after reporting; use the platform regardless of language or literacy level.
>
> **Design direction.** Make FairShift look and feel like a premium, modern, thoughtfully designed application: refined visual hierarchy, excellent mobile interaction patterns, sophisticated typography, strong information architecture, purposeful animation, accessible interaction design. The application must not look like a generic AI-generated SaaS dashboard. Avoid generic dashboard templates, unnecessary charts, fake analytics, decorative icons everywhere, dense layouts and repeated cards with identical hierarchy. **Every visual element must have a reason to exist.**
>
> Keep the brand: Deep Aubergine `#3A0F34`, Ice Silver `#DDE3E8`, Marigold `#EAAA00`.
>
> Redesign: worker navigation, home, Money Jar (never fabricate paid or disbursed amounts), attendance, payslips, FairShift Proof (never overclaim verification), Safe Signal (do not overpromise anonymity), Accountability Loop, safety and heat stress (heat index is not WBGT), notifications, language selection, and the administrator console. […]
>
> **Visual verification is mandatory:** run the real app in a browser, test worker and admin workflows, check 360×800, 375×812, 390×844, 412×915, 768×1024, 1280×800 and 1440×900, capture screenshots, check console errors and failed requests, and fix what you find. Do not destabilize the engineering baseline; every existing test must keep passing.

---

## 4. V4.3: Glassmorphism V2 visual system

> **FAIRSHIFT V4.3 — FINAL VISUAL TRANSFORMATION: GLASSMORPHISM V2 RESTORATION AND PREMIUM DESIGN POLISH**
>
> The original design direction was FairShift Glassmorphism V2, but the V4.2 implementation moved toward conventional solid surfaces. **Glassmorphism V2 must actually exist in the final application.** Do not interpret this as permission to add random translucent cards. I want a complete, intentional material and visual design system.
>
> The visual identity should feel like a combination of premium modern fintech, high-end productivity apps, subtle glass surfaces, deep atmospheric colour and controlled lighting. It should feel expensive without becoming visually noisy. Avoid copying another application's branding; FairShift must retain its own identity.
>
> Redesign the design system first: primary, secondary, floating and interactive glass; lighting and depth; backgrounds. Then transform every worker and employer screen. […]
>
> **Tests must validate the intended design:** brand colours, glass material tokens, backdrop-blur treatments, surface opacity, text and button contrast, minimum touch-target sizes, reduced-motion support, fallback when backdrop filtering is unavailable, consistent use of tokens. Functionality is frozen in this pass.

---

## 5. V5.0: feature completion, security hardening and release

> **FAIRSHIFT V5.0 — FEATURE COMPLETION, SECURITY HARDENING AND PRODUCTION RELEASE**
>
> 1. Fix and fully implement Text-to-Audio across all six supported languages.
> 2. Build an advanced camera-based workplace safety inspection and evidence system.
> 3. Implement biometric authentication for attendance check-in and check-out using WebAuthn/passkeys.
> 4. Resolve deployment problems, prepare the application for Vercel, push to GitHub and deploy.
>
> **Read-aloud:** do not simply repair the English voice and claim multilingual support. Detect available voices, wait for asynchronous voice enumeration, match the BCP-47 code, prefer an exact locale, fall back only when appropriate, tell the user clearly when no suitable voice exists, and never claim playback succeeded when no speech occurred.
>
> **Camera safety inspection:** integrate with Safe Signal, the Accountability Loop and FairShift Proof rather than building a disconnected feature. Strip photo metadata, keep AI analysis advisory, and implement **two-key closure**: the worker submits a hazard photo → the organisation fixes it and uploads after-fix evidence → the reporter reviews before/after and confirms or disputes → only then is the report closed.
>
> **Passkey check-in:** a web application cannot read a fingerprint. Use WebAuthn platform authenticators so the device verifies the user with fingerprint, face or PIN. Do not collect raw fingerprint data, do not store biometric templates, and do not build a fake fingerprint animation that simply accepts a button click.

---

## 6. Final cleanup and Vercel deployment

> **FAIRSHIFT — FINAL REPOSITORY CLEANUP + VERCEL DEPLOYMENT**
>
> Prepare the existing project for submission by reducing repository size, cleaning unnecessary files, preserving the completed V5 functionality, and deploying to Vercel. This is a finalization task, not another development phase.
>
> Hosting: Vercel. Retain the existing SQLite implementation. No new infrastructure, no major backend rewrite, no unnecessary dependencies. Vercel serverless environments do not provide durable local storage: do not hide this limitation or claim durable persistence. Do not sacrifice functionality merely to reduce repository size.

---

## Short follow-up prompts that shaped the result

(Lightly edited for spelling.)

- "Make sure the project adheres to all the rules and has all features, then polish the UI to the cleanest possible."
- "Improve everything, code quality and all, and maximise my current score." (evaluation at that point: 96.79/100, with code quality at 89)
- "What is new and unique about the project, as everyone has it? Tell me if something makes it stand out and how to pitch it with the problem statement."
- "Fix the Vercel deployment, as I'm not able to open it."
- "Commit the remaining work in groups (dashboard, Money Jar, pay and receipts, safety, notifications and sign-in, console). Re-check the screenshots. Run the full checks: tests, typecheck, lint, formatting, both builds, the 57-step HTTP walkthrough, the accessibility check, a contrast check on the rendered screens, and all seven screen sizes."
