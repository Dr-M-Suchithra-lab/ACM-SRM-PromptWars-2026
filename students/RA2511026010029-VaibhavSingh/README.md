# PromptWars 2026 × ACM SRM Student Chapter
## Student Submission Record

- **Student Name:** Vaibhav Singh
- **Register Number:** RA2511026010029
- **Department:** CINTEL, SRM Institute of Science and Technology, Kattankulathur
- **Faculty Mentor:** Dr. M. Suchithra, Associate Professor
- **GitHub Profile:** [https://github.com/Vaibhav8084](https://github.com/Vaibhav8084)
- **Project Repository:** [https://github.com/Vaibhav8084/HISAAB](https://github.com/Vaibhav8084/HISAAB)
- **Live Deployment:** [https://hisaab-beige.vercel.app](https://hisaab-beige.vercel.app)

---

## 1. Problem Statement (Exact from Event Brief)

### PROMPT WARS 2026 × SRM ACM STUDENT CHAPTER
**FairShift: Decent Work Platform**  
*Building fairer, safer, and more transparent workplaces for employee-intensive organisations.*  
**Theme:** UN SDG 8 — Decent Work and Economic Growth

#### The Problem Context: Manual Workforce Management
Large workforces still rely on paper registers, spreadsheets, and WhatsApp groups across key sectors:
- **Construction:** Daily shift workers on active sites.
- **Colleges & Schools:** Campus support and facility staff.
- **Hospitals:** Round-the-clock care and sanitation teams.
- **Factories:** High-volume floor and line operators.

#### Worker Pain Points: Why Workers Struggle Today
- **Opaque Pay Calculations:** Unclear salary breakdowns or uncounted overtime hours.
- **Fear of Identification:** Hesitation to raise complaints or share honest feedback.
- **Unreported Safety Risks:** Workplace hazards ignored until actual injuries occur.
- **Lost Career History:** Unrecorded skills force workers to restart from zero.

#### Systemic Gaps: Employer Blind Spots & User Needs
- **For Employers:**
  - *Zero Workforce Visibility:* No clear view of overworked or unhappy staff.
  - *High Attrition Risk:* Unable to spot employees likely to quit early.
  - *Delayed Escalation:* Issues reach management only after becoming severe.
- **Accessibility Needs:**
  - *Regional Languages:* Workers primarily communicate in native local tongues.
  - *Limited Literacy:* Interfaces must support voice and visual cues.
  - *Basic Smartphones:* Must run smoothly on low-end mobile devices.

#### The Mission: Hackathon Challenge
Make work fairer, safer, and more transparent for everyone. Empower workers with clarity and voice while giving employers actionable insights into workforce health.

#### Cross-Industry Requirement
Your platform must work across at least two distinct industries (e.g., Construction Site + College).

#### Deliverables & Evaluation Criteria
- **Dual Interfaces:** Dedicated mobile-first worker companion and desktop-first employer/admin command cockpit.
- **Evaluation Rubric:** Real-World Impact, Relevance to SDG 8, Inclusivity & Ease of Use, Technical Implementation, and Feasibility & Scalability across multiple sectors.

---

## 2. My Solution — What It Does (In 4 Lines)

FairShift Hisaab is a mobile-first workplace fairness system designed for blue-collar and contract personnel. It replaces easily manipulated paper registers with a cryptographic "Two-Key" ledger where neither shift hours, hazard tickets, nor overtime payouts can be settled unilaterally by a contractor without worker peer consensus. Daily earnings are communicated through a zero-jargon visual SVG Money Jar with voice read-aloud in 6 Indian languages, while workplace grievances are protected inside a privacy-preserving $K=3$ collective escrow vault that shields individuals from retaliatory termination. For employers and admins, a real-time command cockpit surfaces rest deficit violations (<10h), heat index alerts, and automated statutory muster rolls with pure client-side ISO PDF 1.4 legal notice generation.

---

## 3. How I Approached This & What I Discovered

Walking through the SRMIST campus each morning, I regularly watch our facility, maintenance, and sanitation crews reporting for duty. When talking with several workers, one issue kept coming up repeatedly: they would work 2 extra hours deep-cleaning or clearing flooded water lines, but by Saturday afternoon the supervisor's physical notebook only credited them for a standard 8-hour shift. If an individual worker argued, they risked losing tomorrow's daily wage altogether.

I realised that the core issue is not just technology; it is an asymmetry of power. A paper muster roll belongs 100% to the contractor. To fix this, I applied a simple game-theoretic rule: **The Two-Key Rule**. Just like two people must turn their keys together to open a bank locker:
- **Key 1** is the supervisor's timestamped entry.
- **Key 2** is the worker's digital token and independent peer confirmation.

If a worker is not literate in English legal jargon, tabular spreadsheets only intimidate them. That is why I built the **Visual Money Jar**: a graphic container that fills with green liquid as hours are clocked, turning amber if overtime is unacknowledged, and red if deductions occur. Anyone can understand it in two seconds without needing to read a word of English.

---

## 4. Tools & Technologies Used

- **AI Platforms & Prompt Engineering:**
  - **Google Antigravity & Gemini 2.0**: Guided system design, bilingual translations, heuristic rule formulation, and defensive edge-case testing.
- **Frontend Architecture:**
  - **Next.js 15 (App Router)** & **React 19**: Server components, server actions, and instant client hydration.
  - **TypeScript (Strict Mode)**: 100% compile-time type safety with zero type errors.
  - **Tailwind CSS & 60fps.design**: GPU-accelerated interface (`transform: translateZ(0)`), dark obsidian glassmorphism, responsive drop layout, and realistic 3D liquid droplets.
  - **Web Speech API (`speechSynthesis`)**: Native text-to-speech engine providing voice read-aloud across 6 Indian languages (`en`, `hi`, `bn`, `ta`, `pa`, `ur`).
- **Backend, Cryptography & Security:**
  - **Node.js runtime** with deterministic domain modules in `src/core/`.
  - **Native Web Crypto PBKDF2-SHA256**: 100,000 hashing iterations with cryptographically random 16-byte salt for passwords and supervisor PINs.
  - **`jose` (HS256)**: Cryptographically signed 8-hour HTTP-only session cookies.
  - **Sliding-Window IP Rate Limiting**: Built-in throttle blocking automated brute-force attacks.
  - **Anti-XSS Sanitizer**: Defense against script injection on all user-submitted form fields.
- **Database & Offline Layer:**
  - **MongoDB Atlas** (Target account `vaibhavnr06@gmail.com`, database `fairshift_hisaab`).
  - High-availability in-memory document fallback store (`src/lib/db/store.ts`) guaranteeing 100% test and offline execution uptime.
- **Zero-Dependency Document Engine:**
  - Custom pure client-side **ISO PDF 1.4 Generator** (`src/lib/pdf/generateLegalNoticePdf.ts`) generating official `%PDF-1.4` binary streams directly in browser memory without heavy external npm packages.

---

## 5. Live App Screenshots

All screenshots below are captured directly from real mobile and desktop sessions of the running application:

### A. Landing, Identity & Language Accessibility
| Screen | Preview | Highlights |
| :--- | :---: | :--- |
| **App Welcome & Live Camera Scan** | <img src="screenshots/WhatsApp Image 2026-10-30 at 1.51.03 AM.jpeg" width="220" alt="Home Landing" /> | Official Hisaab logo, 60fps mirror morph backdrop, quick QR badge scan, and one-tap demo gateways. |
| **6 Regional Indian Languages** | <img src="screenshots/WhatsApp Image 2026-10-30 at 1.51.04 AM.jpeg" width="220" alt="Language Switcher" /> | Instant language switching across English, Hindi, Bengali, Tamil, Punjabi, and Urdu (with RTL layout). |
| **Instant Demo Credentials** | <img src="screenshots/WhatsApp Image 2026-10-30 at 1.51.06 AM.jpeg" width="220" alt="Demo Login Modal" /> | Universal test number `9999999999` with passcodes `12345` / `123456` for frictionless review. |
| **Personal Settings & Preferences** | <img src="screenshots/WhatsApp Image 2026-10-30 at 1.51.07 AM (1).jpeg" width="220" alt="Settings Modal" /> | Language selection, visual theme palette, sky effects toggle, and coarsened GPS privacy controls. |

### B. Multi-Industry Worksite Configuration
| Screen | Preview | Highlights |
| :--- | :---: | :--- |
| **Cross-Industry Workplace Selector** | <img src="screenshots/WhatsApp Image 2026-10-30 at 1.51.05 AM.jpeg" width="220" alt="Workplace Selector" /> | Dynamic configuration across SRMIST Campus Facilities, Chennai Metro Line 4, Hospital Support, Tech Parks, and Factories. |
| **Sector Adaptation Details** | <img src="screenshots/WhatsApp Image 2026-10-30 at 1.51.05 AM (2).jpeg" width="220" alt="Sector Context" /> | Sector-specific hazard checklists, wage scales, and shift timings configured without hardcoding. |

### C. Worker Shift Companion, Vitals & Visual Money Jar
| Screen | Preview | Highlights |
| :--- | :---: | :--- |
| **Visual Money Jar & Work Receipts** | <img src="screenshots/WhatsApp Image 2026-10-30 at 1.51.07 AM (2).jpeg" width="220" alt="Money Jar" /> | Visual SVG liquid jar showing Total Net Pay (₹4700), overtime breakdown, and flagged ₹720 unpaid gap. |
| **Worker Health Vitals & Geofence** | <img src="screenshots/WhatsApp Image 2026-10-30 at 1.51.07 AM.jpeg" width="220" alt="Worker Vitals" /> | Medical vitals header (Blood Group `O+`, Age 32, Weight 58kg, Height 160cm) with active GPS geofence ring. |
| **Mandatory Safety Gear (PPE) Upload** | <img src="screenshots/WhatsApp Image 2026-10-30 at 1.51.08 AM.jpeg" width="220" alt="Safety Photo" /> | Geotagged photo capture verifying helmet, high-vis vest, and footwear before shift activation. |
| **Voice Read-Aloud Pay Breakdown** | <img src="screenshots/WhatsApp Image 2026-10-30 at 1.51.08 AM (1).jpeg" width="220" alt="Pay Audio" /> | One-tap "Speak my pay" button reading wages aloud in the worker's native tongue. |

### D. Dispute Settlement & Legal Rights
| Screen | Preview | Highlights |
| :--- | :---: | :--- |
| **Statutory Rights Cards** | <img src="screenshots/WhatsApp Image 2026-10-30 at 1.51.08 AM (2).jpeg" width="220" alt="Rights Cards" /> | Practical guidance on double-rate overtime, maximum 48h work week, and minimum wage protections. |
| **Client-Side PDF Notice Generator** | <img src="screenshots/WhatsApp Image 2026-10-30 at 1.51.08 AM (3).jpeg" width="220" alt="PDF Generator" /> | Generates an official ISO PDF 1.4 legal demand letter citing the Code on Wages 2019 and OSH Code 2020. |

### E. Contractor Portal & Dynamic Worksite Reallocation
| Screen | Preview | Highlights |
| :--- | :---: | :--- |
| **Worksite Roster & Shift Allocation** | <img src="screenshots/WhatsApp Image 2026-10-30 at 1.52.08 AM.jpeg" width="220" alt="Contractor Roster" /> | Live headcount, site assignment dropdowns, and skillset tracking across active facilities. |
| **Labour Skillset Registration** | <img src="screenshots/WhatsApp Image 2026-10-30 at 1.52.09 AM.jpeg" width="220" alt="Skill Registration" /> | Register new workers with primary trade (welder, mason, janitor), blood group, and daily wage rate. |

### F. Employer & Admin Command Cockpit
| Screen | Preview | Highlights |
| :--- | :---: | :--- |
| **Critical Warning Center** | <img src="screenshots/WhatsApp Image 2026-10-30 at 1.52.10 AM.jpeg" width="220" alt="Admin Cockpit" /> | Pinned telemetry: rest deficit alerts (<10h), excessive overtime (>8h), PPE non-compliance, and 42m hazard SLA clock. |
| **Working Hours & Muster Roll Table** | <img src="screenshots/WhatsApp Image 2026-10-30 at 1.52.11 AM.jpeg" width="220" alt="Hours Table" /> | Comprehensive telemetry of all workers on site, hours clocked today, GPS location, and PPE status. |
| **PPE Inspection & Audit Modal** | <img src="screenshots/WhatsApp Image 2026-10-30 at 1.52.12 AM.jpeg" width="220" alt="PPE Inspection" /> | High-resolution inspection of worker safety gear photos with GPS watermark and 1-tap Approve/Flag controls. |
| **Statutory Registers Export** | <img src="screenshots/WhatsApp Image 2026-10-30 at 1.52.13 AM.jpeg" width="220" alt="Registers Export" /> | Instant CSV downloads for Form D (Muster Roll), Form IV (Overtime Register), and Form B (Wage Register). |

*(All 44 screenshots are stored uncompressed and uncropped inside the `screenshots/` directory for full inspection.)*

---

## 6. How to Run It from a Fresh Setup

```bash
# 1. Clone the repository
git clone https://github.com/Vaibhav8084/HISAAB.git
cd HISAAB

# 2. Install dependencies (Node.js 20+ recommended)
npm install --legacy-peer-deps

# 3. Verify strict TypeScript type safety (0 errors)
npm run typecheck

# 4. Run automated test suites (91 tests across 17 suites)
npm test

# 5. Launch the development server
npm run dev
```

Open your browser at `http://localhost:3000`.

### Reviewer Demo Access:
- **Universal Mobile Number:** `9999999999` (or any 10-digit number starting with `9`)
- **Universal Passcode / OTP:** `12345` or `123456`
- **Admin Command Password:** `123456` or `777888`
- **One-Tap Demo Buttons:** Available on every screen for instant role inspection.
- **Live Mobile QR Code:** Point your phone camera at the badge QR on screen to instantly log in on your device.

---

## 7. Key Prompts That Built My Solution

Here are the 5 foundational prompts from [`prompts.md`](prompts.md) that shaped the architecture:

1. **Prompt 0 (Foundations & Two-Key Consensus):**  
   *"Design a mobile-first workplace fairness platform for UN SDG 8 Decent Work. Create a two-sided verification protocol where neither overtime hours nor safety closures can be logged unilaterally by an employer without worker consensus."*
2. **Prompt 2 (The Visual SVG Money Jar):**  
   *"Build an interactive SVG Money Jar for workers who cannot read complex financial spreadsheets. The liquid volume should intuitively represent agreed wages, worked overtime, and unexplained wage deductions."*
3. **Prompt 4 (Collective Escrow Vault):**  
   *"Implement a privacy-preserving grievance vault with K-anonymity ($K=3$). Individual complaints against dangerous contractors must remain sealed until 3 independent workers corroborate the same issue, protecting workers from immediate retaliation."*
4. **Prompt 7 (Worker Health Vitals & Mandatory Safety Photo):**  
   *"Add health vitals (blood group, age, weight, height) to the worker companion. Require a geotagged photo capture of safety gear (helmet, boots, vest) before shift check-in with GPS verification."*
5. **Prompt 9 (Client-Side ISO PDF 1.4 Generator):**  
   *"Build a pure TypeScript binary stream generator for ISO PDF 1.4 legal dispute notices citing the Code on Wages 2019 without relying on external npm packages."*

---

## 8. What I Learnt from Building This

1. **Designing for Real Constraints:** Building for contract workers taught me that if a button is too small to tap with dusty hands under direct sunlight, or if text requires fluent English, the system is fundamentally broken. Accessibility is not an optional feature; it is the entire product.
2. **Resilience over Dependencies:** External libraries often break in edge environments. Writing the PDF generator and the Web Crypto PBKDF2 hashing in pure TypeScript gave me total confidence that the code will compile and run anywhere without unexpected package failures.
3. **Prompting Requires Engineering Rigor:** Using AI effectively is not about typing casual requests; it requires precise specifications, defensive boundary conditions, deterministic test assertions, and strict security hardening at each step.
