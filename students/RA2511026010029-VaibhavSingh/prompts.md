# PromptWars 2026 × ACM SRM Student Chapter
## Key Prompts Log — FairShift Hisaab

- **Student Name:** Vaibhav Singh
- **Register Number:** RA2511026010029
- **Event:** PromptWars 2026, Department of Computing Technologies, SRMIST Kattankulathur
- **Faculty Mentor:** Dr. M. Suchithra, Associate Professor

---

### Overview of My Prompting Strategy
When building FairShift Hisaab, I didn't try to build the whole app in a single giant prompt. Instead, I broke the project down into a step-by-step modular progression:
1. First, establish the core mathematical and game-theoretic logic (the Two-Key rule, tamper-evident hashing, and collective escrow).
2. Second, build the worker-facing low-literacy components (the visual SVG Money Jar, voice read-aloud, and 72px touch targets).
3. Third, build the contractor and employer operational cockpits (worksite management, labour skillset reallocation, and statutory muster CSV downloads).
4. Fourth, add real-world physical verification (mandatory safety gear PPE photos, GPS geofencing, and camera-scannable QR auto-login).
5. Fifth, harden security, database integration (MongoDB Atlas for `vaibhavnr06@gmail.com`), and pure client-side PDF document generation.

Below are the exact key prompts I crafted and used to build this solution.

---

### Prompt 0: Project Brief, Two-Key Protocol & Design System
```text
Project: FairShift Hisaab - Workplace Fairness Platform for UN SDG 8 (Decent Work & Economic Growth).
Target Users: Vulnerable informal, gig, and contract workers across campus facilities, metro rail construction, and hospitals.

Core Architectural Rules:
1. Implement the 'Two-Key Rule': No shift record, overtime payout, or safety hazard ticket can ever be marked resolved by a supervisor alone. It requires Key 1 (Supervisor proof/photo) AND Key 2 (Worker confirmation or peer consensus).
2. Design Tokens: Obsidian Glass on dark (#0A0B0A page background, #101310 surfaces, #A3E635 lime accent, #F2F5F1 primary text). Text on lime must always be black.
3. Typography: Load Plus Jakarta Sans for English, with dynamic fallbacks for Noto Sans Devanagari, Bengali, Tamil, Gurmukhi, and Nastaliq Urdu (RTL).
4. Low-Literacy Rules: Never use walls of text. Money amounts must be 44px tabular numbers. Touch targets must be at least 56px to 72px.
5. Provide Next.js 15 App Router setup with strict TypeScript and Vitest test harness.
```
*Why this was effective:* It established strict constraints upfront, preventing generic Bootstrap-like designs and forcing the AI to think about font weights, Indic script line-heights, and game-theoretic rules from day one.

---

### Prompt 1: The Visual SVG Money Jar & 3-Row Work Receipt
```text
Build the Money and Wage Transparency screen (/app/money) with zero accounting jargon:
1. Visual SVG Money Jar: Draw an SVG jar with lime fluid and gold rupee coins showing Total Net Disbursed. If there is a wage discrepancy, render a clear red alert tag below the jar.
2. 3-Row Work Receipt Card:
   - Row 1: CONTRACT AGREED (agreed hours * agreed rate)
   - Row 2: ACTUALLY WORKED (recorded hours via Two-Key log, highlighting verified overtime)
   - Row 3: CASH DISBURSED BY THEKEDAR (actual cash placed in worker's envelope)
3. Discrepancy Detection: If Row 2 > Row 3, calculate the exact rupee difference and display an instant action button: 'Generate Official Legal Notice PDF'.
4. Include a 'Still Working' consensus overtime ping button for workers whose shift has ended on paper but who are still required to work on site.
```
*Why this was effective:* Informal workers often don't understand terms like "gross deductions" or "prorated arrears". Translating accounting formulas into an agreed-worked-paid comparison makes wage theft immediately visible.

---

### Prompt 2: Collective Voice Escrow & Differential Privacy ($K=3$)
```text
Create the Speak Up & Whistleblower vault in src/core/escrow.ts and /app/speak-up:
1. Retaliation Protection: An individual worker who reports supervisor wage theft or harassment is at risk of being fired. Implement a Collective Escrow vault where complaints are stored in an encrypted queue.
2. Threshold Rule (K=3): A group alert is strictly locked and completely hidden from the employer/contractor dashboard until 3 or more distinct workers report the same target (zone or supervisor).
3. Urgent Safety Bypass: If a report is flagged as an imminent life-safety hazard, bypass the K=3 threshold and escalate immediately.
4. Privacy Scrubbing: Automatically strip names, phone numbers, and identifying details before reports enter the escrow queue.
```
*Why this was effective:* It solves the real-world fear of reporting. By making the threshold $K=3$, individual workers are protected by mathematical group anonymity.

---

### Prompt 3: Theme Palette Dropdown & 3D Liquid Water Droplets
```text
Upgrade the theme switcher and visual feedback:
1. Change ThemeSwitcher to a styled dropdown menu with a Palette icon, exactly matching LanguageSwitcher, with options:
   - Obsidian Glass (Dark)
   - Lime Droplets (Water)
   - Sketch Mono (Paper)
   - Concrete Day (Light)
2. For the Lime Droplets theme, do not just use flat white dots. Implement realistic 3D liquid water drops using multi-layered radial gradients with:
   - Curved specular glares (rgba(255, 255, 255, 0.95))
   - Lime caustic fluid refractions
   - Dark meniscus outer rings and contact drop shadows
   - Micro-condensation droplets scattered across the glass surfaces.
```
*Why this was effective:* It gave the application a memorable, tactile personality that stands out during panel presentations while demonstrating advanced CSS gradient engineering.

---

### Prompt 4: Real-Time Smartphone Camera QR Auto-Login
```text
Make the QR badge on the login screen real-time scannable:
1. When any user opens /login/auth or the Welcome modal, generate an actual scannable QR code using the 'qrcode' library that encodes the host URL with a signed login endpoint (/api/auth/qr-login).
2. When a smartphone camera scans this QR code from across the room, the phone must open the browser, automatically set a cryptographically signed 8-hour JWT session cookie (jose HS256), and redirect straight to the Worker Companion (/app) or Admin Cockpit (/admin).
3. Support universal demo passcodes (12345, 123456, 777888) and default phone 9999999999 so evaluators can test immediately with zero friction.
```
*Why this was effective:* Evaluators can test the app on their own phones without typing long credentials, proving practical real-world usability on actual devices.

---

### Prompt 5: Contractor Portal: Worksite Creation & Dynamic Labour Allocation
```text
Build out the Contractor (/contractor) operations portal:
1. Worksite Management: Provide a '+ Add Worksite' modal allowing contractors to register new sites specifying Name, Sector, Street Address, and Required Skillsets (e.g., Bar Bending, Sanitation, Rebar Tying, Electrical).
2. Labour Registration: Provide a '+ Register Labour' modal capturing Name, Phone, Primary Skillset, Blood Group (O+, B+, etc.), and Daily Wage Rate.
3. Live Site Allocation: Add an interactive dropdown on every worker card to reallocate them to different worksites in real time, updating active crew muster tallies instantly.
4. Scorecard: Display contractor pay accuracy and hazard resolution rates verified by the principal employer.
```
*Why this was effective:* It expanded the platform beyond workers into a complete two-sided ecosystem where thekedars manage rosters and skill deployment transparently.

---

### Prompt 6: Worker Health Vitals & Mandatory Safety PPE Photo Check-in
```text
Add medical safety bio-metrics and mandatory physical safety gear verification:
1. Worker Profile Modal: Clicking the worker avatar in /app opens a profile modal with camera snap (capture='user') or gallery upload for profile picture, plus Blood Group, Age, Body Weight (BW), and Height. Persist to localStorage.
2. Mandatory PPE Verification: Before a worker can check in for a shift in /app, require them to capture or upload a safety gear photo showing their Hard Hat, High-Vis Vest, and Gloves/Boots.
3. If no photo is uploaded, block check-in and display a clear validation warning.
4. Automatically watermark the photo with real-time GPS coordinates and timestamp.
5. Worksite Map: Display worker location relative to the designated worksite with a green safe geofence perimeter ring.
```
*Why this was effective:* It connects physical occupational safety with digital attendance, ensuring workers are properly equipped before entering hazardous environments.

---

### Prompt 7: Admin Cockpit: Critical Warning Center & Working Hours Telemetry
```text
Enhance the Employer Command Cockpit (/admin):
1. Pinned Critical Warning Center: Add a 'What Every Admin Must Know' banner at the top of the Overview tab highlighting:
   - Rest Deficit Violations (<10h between shifts under OSH Code 2020)
   - Overtime Outliers (>8.0h requiring 2x statutory rate authorization)
   - Safety Gear (PPE) Non-Compliance Flags
   - Hazard Escalation SLA Clocks (<1h remaining before regulatory escalation)
   - NOAA Wet-Bulb Heat Stress Advisories (enforcing 15-minute hydration cycles)
2. Active Roster & Working Hours Table: List all active on-site personnel with hours logged today, prior rest elapsed, GPS coordinates, and safety photo badge.
3. Safety Gear Photo Inspection Modal: Clicking 'Inspect' on any worker opens a high-res photo modal with GPS watermark and checklist, allowing the admin to click 'Approve PPE & Clear Shift' or 'Flag Non-Compliance'.
```
*Why this was effective:* It provides site managers with actionable, life-critical intelligence rather than vanity charts, directly supporting UN SDG Target 8.8.

---

### Prompt 8: Pure Client-Side ISO PDF 1.4 Legal Dispute Generator
```text
In src/lib/pdf/generateLegalNoticePdf.ts and /app/rights:
1. Do not use external npm packages like jspdf or pdfkit that require heavy binaries or internet installs.
2. Build a pure TypeScript client-side ISO PDF 1.4 binary stream generator that constructs raw PDF catalog, font dictionaries, and text streams.
3. Generate a formal 'Notice of Statutory Wage Arrears' citing the Code on Wages 2019 (Sections 18 & 24) and OSH Code 2020.
4. Include Worker Name, Phone, Blood Group, Worksite Address, Outstanding Arrears Due, 7-day settlement deadline, and the cryptographic SHA-256 shift ledger hash.
5. Trigger an instant browser download (.pdf) with zero external network requests.
```
*Why this was effective:* It eliminated external library failures, kept the repository size small, and gave workers a tangible legal document they can print or present to labor authorities.

---

### Prompt 9: MongoDB Atlas Integration & Enterprise Security Hardening
```text
Harden the backend and connect MongoDB Atlas:
1. MongoDB Connector: Create src/lib/db/mongodb.ts configured for account vaibhavnr06@gmail.com and database fairshift_hisaab.
2. Resilient In-Memory Buffer: Implement src/lib/db/store.ts with full CRUD collections (users, shifts, receipts, hazards, complaints, worksites) pre-seeded so the app never crashes during offline evaluation or demo builds.
3. Cryptographic Password Hashing: Implement PBKDF2-SHA256 with 100,000 iterations and 16-byte random salt using the native Web Crypto API in src/lib/security/hash.ts.
4. Input Sanitization & Anti-XSS: Implement src/lib/security/sanitize.ts to strip malicious script tags and injection vectors.
5. Sliding-Window Rate Limiting: Implement src/lib/security/rateLimit.ts to protect /api/auth/* against brute-force attacks.
6. Security Headers: In next.config.mjs, add CSP, X-Frame-Options: DENY, X-Content-Type: nosniff, X-XSS-Protection: 1, and HSTS.
7. Verify with automated tests in tests/core/security.test.ts and ensure repo size remains < 10 MB.
```
*Why this was effective:* It elevated the project from a hackathon prototype into an enterprise-grade, production-hardened platform that passes all automated security scans.
