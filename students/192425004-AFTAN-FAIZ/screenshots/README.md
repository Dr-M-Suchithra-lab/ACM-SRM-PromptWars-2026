# NYAVERIS AI — Genuine screenshots

Captured on **31 October 2026 (Asia/Kolkata)** with Playwright and installed Chrome from the submitted production build at `http://127.0.0.1:8188`, using the existing synthetic Supabase demonstration backend. These are browser captures, not generated mockups. No business records were changed during capture; demo authentication uses the existing gateway and persistent rate-limit infrastructure.

| File | Actual view |
| --- | --- |
| landing-page.png | Landing page |
| login-page.png | Sign-in page, blank credentials |
| worker-dashboard.png | Construction worker dashboard with synthetic records |
| admin-dashboard.png | Employer command center (admin dashboard) |
| fairness-twin.png | FairPay Twin / Fairness Twin wage comparison |
| proofloop.png | Fairness Replay dialog with persisted ProofLoop history |
| safesignal.png | Anonymous concern form before submission |
| restguard.png | Healthcare RestGuard unsaved 13:00 what-if preview (6h rest gap) |
| worker-mobile.png | Worker pay view at 360px width |

Credentials, access tokens and anonymous tracking secrets are not shown. Names and payroll records belong to the existing synthetic tenants. The original image bytes are preserved. The capture script in `scripts/capture-submission.mjs` can reproduce these captures after a build; configured credentials are read into process memory, not copied or saved.
