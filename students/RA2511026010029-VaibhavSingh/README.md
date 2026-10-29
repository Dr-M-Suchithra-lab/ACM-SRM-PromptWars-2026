# PromptWars 2026 × ACM SRM Student Chapter
## Student Submission Record

- **Student Name:** Vaibhav Singh
- **Register Number:** RA2511026010029
- **Department:** Department of Computing Technologies, SRM Institute of Science and Technology, Kattankulathur
- **Faculty Mentor:** Dr. M. Suchithra, Associate Professor
- **GitHub Profile:** [https://github.com/Vaibhav8084](https://github.com/Vaibhav8084)
- **Project Repository:** [https://github.com/Vaibhav8084/HISAAB](https://github.com/Vaibhav8084/HISAAB)
- **Live Deployment:** [https://hisaab-git-main-vaibhav8084s-projects.vercel.app](https://hisaab-git-main-vaibhav8084s-projects.vercel.app)

---

## 1. Problem Statement (As Given)
**UN Sustainable Development Goal 8: Decent Work & Economic Growth**

Across informal and contract sectors (university facilities, metro rail construction sites, and municipal hospitals), daily-wage workers face four persistent challenges:
1. **Unrecorded Overtime & Wage Theft**: Paper muster rolls are controlled unilaterally by the thekedar (contractor), making overtime hours routinely disappear on payday.
2. **Hazard Neglect**: Safety violations (like exposed 230V wiring near water pipes or missing fall harnesses) are either ignored or marked "fixed" on paper without real physical verification.
3. **Fear of Retaliation**: An individual worker who speaks up alone risks being fired, blacklisted, or having daily wages docked.
4. **Literacy & Language Barriers**: Most workplace tools are full of dense English legal jargon that everyday workers cannot read or navigate under hot sun on a mobile phone.

The challenge is to build a smart, accessible, and mathematically verifiable AI platform that creates genuine two-sided transparency between workers and employers.

---

## 2. My Solution — What It Does (In 4 Lines)
FairShift Hisaab is a mobile-first workplace fairness platform that replaces one-sided paper logs with a cryptographic "Two-Key" ledger: no shift, overtime payment, or hazard ticket can be closed without both employer proof and worker consensus. It features a zero-jargon visual SVG Money Jar, mandatory geotagged safety gear (PPE) photo verification, an anonymous collective complaint escrow vault ($K=3$), and a pure client-side PDF legal dispute generator. The platform adapts across campus sanitation, metro construction, and hospital healthcare workers in 6 Indian languages with full voice read-aloud.

---

## 3. How I Thought of This & What Came to My Mind
Living on the SRMIST Kattankulathur campus, I walk past our hostel sanitation and maintenance staff every day. I often noticed them signing paper muster sheets or waiting near contractor desks at the end of long shifts. When talking to a few campus facility workers, I learned that a common frustration is staying 2 extra hours for deep cleaning or emergency pipe repairs, only to find that the cash envelope on Saturday still contains the basic 8-hour daily wage with zero overtime recorded.

When I started brainstorming for PromptWars, I asked myself: *Why can't shift check-in work like a joint bank locker?* An employer shouldn't be able to unilaterally decide what happened on a shift. That gave birth to the **"Two-Key Rule"**:
- Key 1 is the employer or supervisor's log.
- Key 2 is the worker's own digital token and coworker peer confirmation.

For the visual design, I wanted to completely eliminate confusing financial tables. A worker doesn't need to read complicated accounting sheets; they just want to see a clear visual "Money Jar" showing what was agreed, what was worked, and what was actually paid into their hand.

---

## 4. Tools & Technologies Used

- **AI Platforms & Reasoning**:
  - **Google Antigravity & Gemini 2.0**: Used for iterative prompt-driven architectural design, synthetic bilingual translations, and visual pattern matching.
- **Frontend**:
  - **Next.js 15 (App Router)** & **React 19**: Server components, server actions, and fast client hydration.
  - **TypeScript (Strict Mode)**: 100% type safety with zero compile errors.
  - **Tailwind CSS**: 60fps GPU-accelerated design system (`transform: translateZ(0)`), realistic 3D liquid droplets theme with caustic refractions, and responsive obsidian glassmorphism.
  - **Web Speech API (`speechSynthesis`)**: Text-to-speech audio guidance across all 6 Indian languages.
- **Backend & Security**:
  - **Node.js runtime** with pure TypeScript domain engines in `src/core/`.
  - **Web Crypto API (PBKDF2-SHA256)**: Salted password and PIN hashing with 100,000 iterations for secure authentication.
  - **`jose` (HS256)**: Cryptographically signed 8-hour HTTP-only session cookies.
  - **Sliding-Window IP Rate Limiter**: Built-in protection against brute-force attacks on login endpoints.
  - **Anti-XSS Sanitizer**: Strips malicious injection vectors on all input fields.
- **Database**:
  - **MongoDB Atlas** (Configured for `vaibhavnr06@gmail.com` under database `fairshift_hisaab`).
  - High-availability in-memory document store fallback (`src/lib/db/store.ts`) ensuring 100% uptime even during offline evaluation.
- **Document Engine**:
  - Custom pure client-side **ISO PDF 1.4 Generator** (`src/lib/pdf/generateLegalNoticePdf.ts`) built with zero external package dependencies. Generates binary `%PDF-1.4` formal legal grievance notices directly in the browser.

---

## 5. Key Screens & Screenshots

The complete screenshots are available in the `screenshots/` directory:

| Screenshot | What It Shows |
| :--- | :--- |
| [`01-hisaab-logo.jpg`](screenshots/01-hisaab-logo.jpg) | Official FairShift Hisaab app brand logo with hardhat, handshake, and rupee document. |
| [`02-bg-mirror-handshake.png`](screenshots/02-bg-mirror-handshake.png) | Construction skyline with reflective floor mirror-morph background effect. |
| [`03-worker-companion.svg`](screenshots/03-worker-companion.svg) | Worker shift dashboard with health vitals (Blood group, Age, BW, Height), GPS geofence map, and mandatory PPE photo verification. |
| [`04-money-jar-receipt.svg`](screenshots/04-money-jar-receipt.svg) | Visual SVG Money Jar and 3-row Work Receipt (Agreed vs. Worked vs. Paid) showing ₹120 unpaid gap. |
| [`05-contractor-management.svg`](screenshots/05-contractor-management.svg) | Contractor portal with active worksite management and dynamic labour skillset reallocation. |
| [`06-admin-cockpit.svg`](screenshots/06-admin-cockpit.svg) | Admin cockpit with Critical Warning Center (rest violations, overtime outliers, PPE flags, 42m SLA clock). |
| [`07-ppe-inspection-modal.svg`](screenshots/07-ppe-inspection-modal.svg) | Admin PPE inspection modal showing high-res worker photo with GPS watermark and Approve/Flag controls. |
| [`08-legal-notice-pdf.svg`](screenshots/08-legal-notice-pdf.svg) | Worker rights legal demand notice generator citing the Code on Wages 2019 and OSH Code 2020. |

---

## 6. How to Run It from Scratch

```bash
# 1. Clone the repository
git clone https://github.com/Vaibhav8084/HISAAB.git
cd HISAAB

# 2. Install dependencies (Node 20+ recommended)
npm install --legacy-peer-deps

# 3. Verify TypeScript type safety (0 errors)
npm run typecheck

# 4. Run automated test suite (91 tests across 17 suites)
npm run test

# 5. Check repository size (2.01 MB, well within 10 MB limit)
npm run check:repo-size

# 6. Launch development server
npm run dev
```

Open `http://localhost:3000` in your browser.

### Demo Credentials:
- **Worker / Contractor Mobile**: `9999999999` (or any `9...` number)
- **Universal Passcode**: `12345` or `123456`
- **Admin Password**: `123456` or `777888`
- **One-Tap Demo Buttons**: Available on all login screens for instant frictionless access.
- **Live Mobile QR Code**: Point any phone camera at the QR code on the welcome or login screen to auto-login directly on your mobile device.

---

## 7. Key Prompts That Built My Solution

A complete step-by-step prompt pack is documented in [`prompts.md`](prompts.md). Here are the 5 core prompts that drove the architectural breakthrough:

1. **Prompt 0 (The Foundation)**: Establishing the UN SDG 8 Decent Work brief, obsidian glassmorphism design tokens, 72px oversized touch targets, and the mathematical Two-Key Rule.
2. **Prompt 2 (The Visual Money Jar)**: Creating the zero-jargon SVG Money Jar and 3-row shift receipt (Agreed, Worked, Paid) that makes wage deductions immediately understandable to someone who cannot read text.
3. **Prompt 4 (Collective Voice Escrow)**: Building the privacy-preserving vault with K-anonymity ($K=3$) so complaints are only decrypted once 3 independent workers corroborate the same issue, shielding individuals from retaliation.
4. **Prompt 7 (Worker Health Vitals & Mandatory Safety Photo)**: Enforcing mandatory PPE photo uploads with GPS watermarks and adding blood groups, body weight, and height to the worker profile.
5. **Prompt 9 (Client-Side Legal Notice Generator)**: Writing a pure TypeScript ISO PDF 1.4 binary stream generator so workers can download legal grievance letters citing the Code on Wages 2019 without needing heavy, broken external npm libraries.

---

## 8. What I Learnt from This Hackathon
1. **Accessibility is not an afterthought**: Designing for informal workers taught me that if an interface relies on complex words or tiny buttons, it has already failed. Building high-contrast themes, speech synthesis, and big visual metaphors is essential for real-world impact.
2. **Zero-Dependency Resilience**: Relying on external third-party PDF or mapping packages can easily break in production or sandbox environments. Writing pure TypeScript implementations (like the PDF 1.4 generator and the Web Crypto PBKDF2 hashing) gave me total control over reliability and kept the repo size under 2.5 MB.
3. **Prompting as an Engineering Discipline**: Vibe coding is not just asking an AI to "make an app"; it requires structured thinking, defensive specifications, edge-case unit testing, and rigorous security verification at every iteration.
