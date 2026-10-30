# NYAVERIS AI — Key development prompts
## 1. Initial application development

```text
Your mission is to design, build, test, optimize, and prepare for deployment an outstanding, production-minded hackathon application for **PromptWars 2026**, organized by the ACM Student Chapter at SRMIST.

This project must demonstrate exceptional originality, real-world usefulness, technical implementation, inclusivity, security, and scalability.

The final product should feel like a credible technology startup application rather than a generic hackathon demonstration.

You must write actual working code in the project repository.

Do not limit your output to architectural explanations, pseudocode, project plans, or interface mockups.

Actively implement the application.

Run available tests.

Identify and correct bugs.

Verify important user flows.

Never claim something is functional without testing it.
```

## 2. Supabase integration

```text
# 13. SUPABASE DATABASE ARCHITECTURE

Use Supabase PostgreSQL as the database.

Create a normalized relational schema.

Recommended tables:

organizations

organization_members

worker_profiles

shifts

pay_policies

payroll_entries

pay_disputes

dispute_events

safety_reports

safety_case_events

rest_warnings

sector_configurations

Optional tables:

skill_records

import_jobs

notifications

Use:

- UUID primary keys.
- Foreign key constraints.
- Appropriate unique constraints.
- Timestamps.
- Relevant indexes.
- PostgreSQL transactions.
- Check constraints where appropriate.
- Explicit organization relationships.
- Database migrations.

All core tables must use persistent storage.

## ROW LEVEL SECURITY

Enable Row Level Security on every exposed application table.

Use least-privilege grants and separate policies for supported operations.

Workers must only access records they are entitled to see.

Administrators must only access records belonging to organizations they are authorized to manage.

Do not trust organization IDs supplied by frontend requests.

Do not use user-editable metadata as an authorization source.

Store organization roles and memberships in protected database records.

Use secure membership-based policies.

Never expose service-role or other Supabase secret keys in frontend code.

If privileged server operations are required, perform explicit authorization checks before accessing data.

Avoid unsafe SECURITY DEFINER functions.

Keep sensitive internal functions and anonymous-case secrets inaccessible through the public Data API.

Test RLS using separate worker and administrator identities from different organizations.

Include both successful-access and denied-access tests.

Create SQL migration files and a documented schema.
```

## 3. Worker and employer dashboards

```text
# 11. WORKER DASHBOARD

Create a premium, mobile-first worker experience.

The interface should be visually attractive but extremely simple to use.

PRIMARY NAVIGATION:

- Home
- My Shifts
- My Pay
- Report Concern
- My Cases
- Profile

## HOME SCREEN

Display:

A personalized greeting.

Today's shift.

Recent earnings.

Pending pay disputes.

Safety case updates.

Quick actions.

## PAY SCREEN

Display:

Expected earnings.

Recorded earnings.

Regular hours.

Overtime.

Potential discrepancies.

Interactive pay breakdown.

Request Review button.

Fairness Replay button.

## SAFETY SCREEN

Provide:

A large Report Concern button.

Accessible reporting form.

Tracking instructions.

Case history when the worker has the appropriate credentials.

## ACCESSIBILITY

Use:

- Large touch targets.
- Clear typography.
- High-contrast interfaces.
- Text labels alongside icons.
- Minimal unnecessary steps.
- Keyboard navigation.
- Screen-reader-friendly semantic HTML.
- Clear validation messages.
- Responsive layouts.
- Regional language selection.

Optimize the experience for basic Android smartphones and slower internet connections.

---

# 12. EMPLOYER COMMAND CENTER

Create a sophisticated administrative dashboard.

MAIN SECTIONS:

Overview.

Workforce.

Shift Management.

Payroll Intelligence.

Pay Disputes.

Safety Reports.

RestGuard.

Analytics.

Organization Settings.

## DASHBOARD METRICS

Display meaningful live metrics:

- Active workers.
- Shifts completed.
- Pending pay disputes.
- Total potential wage discrepancies.
- Open safety cases.
- Rest-risk warnings.
- Average case resolution time.

Calculate metrics from Supabase data.

Do not hard-code dashboard values.

## PRIORITY ACTION CENTER

Create an actionable task queue.

Highlight:

- Unresolved payroll discrepancies.
- High-priority safety reports.
- Scheduling-risk warnings.
- Cases awaiting administrator review.

Allow filtering and status updates.

Make every button functional.

Use clear confirmation and error feedback.
```

## 4. Fairness Twin

```text
## IMPLEMENTATION RULES

Use deterministic TypeScript calculations.

Represent money using integer paise rather than floating-point currency values.

Handle overnight shifts correctly.

Handle unpaid breaks.

Use explicit time zones.

Support configurable organization-specific pay policies.

Do not treat demonstration overtime rules as universal legal requirements.

Ensure calculations are thoroughly unit-tested.
```

## 5. ProofLoop

```text
# 6. SIGNATURE FEATURE TWO — PROOFLOOP

Create an innovative workplace accountability system called:

**ProofLoop — Evidence-to-Action Timeline**

This is the product's strongest differentiating feature.

Every important event in a workplace dispute must have a traceable history.

Example:

1. Shift created.
2. Worker records shift completion.
3. Worker confirms hours.
4. Employer payroll entry recorded.
5. FairPay detects a discrepancy.
6. Worker submits a review request.
7. Employer examines the issue.
8. Employer provides a correction.
9. Worker confirms the outcome.
10. Case is closed.

Create a visually compelling timeline interface.

The timeline must show:

- Event timestamp.
- Event type.
- Relevant calculation or status changes.
- Explanation.
- Responsible role when appropriate.
- Current case status.

Avoid silently overwriting important historical records.

Use PostgreSQL transactions for changes that must update business records and event history together.

Keep audit events append-only at the application level and restrict unauthorized edits and deletion.

Do not falsely claim that application audit history is immutable or tamper-proof.

Optional enhancement:

Create a verifiable receipt using server-managed cryptographic signatures.

Only implement this after the essential functionality is stable.

A signed receipt verifies the integrity of the recorded receipt, not the truth of the underlying work claim.
```

## 6. SafeSignal

```text
## PRIVACY REQUIREMENTS

Anonymous reports must not be directly linked to employee account IDs.

Generate a secure, random case reference and a separate secret access token.

Store only a secure hash of the access token.

Do not expose anonymous case tables through unrestricted client access.

Handle anonymous submissions and tracking through carefully validated and rate-limited backend endpoints.

Keep server-side credentials confidential.

Do not retain unnecessary identifying information.

Explain that anonymity cannot be absolutely guaranteed because report contents or infrastructure information could sometimes reveal identity.
```

## 7. RestGuard

```text
## UNIQUE ENHANCEMENT — SCHEDULE WHAT-IF

Give administrators an interactive schedule-adjustment interface.

When the administrator changes a proposed shift, instantly recalculate potential rest violations.

Example:

Original next shift: 1:00 PM.

Suggested next shift: 6:00 PM.

Show how the configured rest warning changes.

Do not automatically change schedules without human confirmation.

This feature demonstrates prevention rather than only detection.
```

## 8. Gemini and Saarthi AI

```text
# 9. SAARTHI AI — MULTILINGUAL WORKER ASSISTANT

Integrate Google Gemini meaningfully.

Create a specialized assistant called:

**Saarthi AI**

It must help workers understand:

- Salary calculations.
- Overtime.
- Pay discrepancies.
- Safety reporting.
- Case statuses.
- Scheduling warnings.
- Available application actions.

SUPPORT THREE LANGUAGES:

1. English.
2. Tamil.
3. Hindi.

Implement core interface translations using reliable application translation files.

Use Gemini for optional contextual explanations.

Where appropriate, provide audio assistance using supported browser capabilities.

Always include a text fallback.

IMPORTANT:

Do not send unnecessary personal information to Gemini.

Do not send anonymous report tracking secrets to Gemini.

Do not use Gemini for wage mathematics.

Do not let the assistant fabricate employment regulations.

Treat Gemini responses as explanatory assistance, not authoritative legal advice.

Use structured outputs validated through Zod.

Implement graceful fallback behavior if Gemini is unavailable.

The main application must continue functioning without Gemini.
```

## 9. UI improvements

```text
# 16. PREMIUM USER INTERFACE

Create a polished, professional SaaS application.

DESIGN STYLE:

Modern.

Premium.

Minimal.

Trustworthy.

Human-centered.

Futuristic without unnecessary visual complexity.

COLOR SYSTEM:

Primary: Deep Navy.

Secondary: Electric Blue.

Accent: Teal.

Background: Soft White.

Warnings: Amber.

Critical Issues: Red.

Success: Green.

Use accessible contrast and do not rely on color alone.

[Excerpt omitted: historical branding instructions.]

## DASHBOARD DESIGN

Use:

- Responsive navigation.
- Reusable cards.
- Clean data tables.
- Accessible dialogs.
- Useful charts.
- Smooth but restrained transitions.
- Clear loading states.
- Helpful empty states.
- Error boundaries.
- Toast notifications.
- Consistent spacing.

Avoid generic template aesthetics.

Create a distinctive visual identity for Fairness Replay.

Make the central fairness workflow understandable through visual interaction.
```

## 10. Vercel deployment

```text
Rename my existing Vercel deployment project to **nyaveris-ai**.

My desired production URL is:

[**https://nyaveris-ai.vercel.app**](https://nyaveris-ai.vercel.app)

Tasks:

1. Identify the existing Vercel project connected to this repository.
2. Rename the Vercel project to `nyaveris-ai`.
3. Configure `nyaveris-ai.vercel.app` as the production domain if available.
4. Update any application references to the old deployment URL.
5. Update Supabase authentication redirect URLs and allowed origins where required.
6. Preserve all existing features, database connections, environment variables, and GitHub integration.
7. Redeploy the application to Vercel if necessary.
8. Verify the new URL works correctly, including authentication, API endpoints, and dashboards.

**Important:** Do not create a duplicate Vercel project, modify database schemas, or change application functionality.

If the desired domain is unavailable or Vercel authentication is required, report the issue and provide the exact steps needed.

Complete the deployment update and report the verified production URL.

```

## 11. Testing and debugging

```text
# 18. AUTOMATED TESTING

Create real automated tests.

## UNIT TESTS

Test:

Regular wages.

Overtime calculations.

Overnight shifts.

Break deductions.

Pay discrepancies.

Rest intervals.

Schedule What-If calculations.

Input validation.

## INTEGRATION TESTS

Test:

Worker authentication.

Administrator authorization.

Organization isolation.

Payroll dispute creation.

Dispute resolution.

Audit event creation.

Anonymous safety report submission.

Anonymous tracking-token verification.

Safety case updates.

Gemini fallback behavior.

## DATABASE SECURITY TESTS

Verify:

Workers cannot access unrelated worker records.

Administrators cannot access another organization's data.

Unauthenticated users cannot access protected records.

Unauthorized users cannot modify pay policies.

Anonymous case credentials are not publicly accessible.

Service-role credentials never appear in browser bundles.

Run Supabase database and RLS tests where the connected environment supports them.

## END-TO-END TESTS

Use Playwright or BrowserAct.

Test:

Worker dashboard navigation.

Pay discrepancy reporting.

Employer dispute resolution.

Safety reporting.

Safety case tracking.

Hospital RestGuard warnings.

Language switching.

Responsive mobile layouts.

Keyboard accessibility.

Test narrow mobile viewports.

Never report a test as passed unless it actually executed successfully.
```

## 12. Quality-preservation follow-up

Verbatim excerpt from user message `01a17c30-9b56-70c0-af61-7a29a194c0f1`:

```text
## RULE 1 — PRESERVE THE APPLICATION

Do not change:

- Application name.
- Logo.
- Branding.
- Existing visual design.
- Color palette.
- Typography.
- Page layouts.
- Navigation structure.
- Existing features.
- User workflows.
- Existing API contracts.
- Authentication behavior.
- Supabase database records.
- Existing database relationships.
- Gemini functionality.
- Deployment domain.
- Existing environment variable names.

Do not remove or disable working functionality.

Preserve the current user experience on desktop and mobile.
```

## 13. Submission preparation

Genuine excerpts from the current participant request:

> THE ONLY APPLICATION NAME IS: NYAVERIS AI

> Make branding changes only in the submitted copy.

> Do not invent development history.

> Do not generate fake screenshots.

> All file writes must remain inside my submission folder.

The participant also authorized branch creation:

> you activate or create the branch and follow the instructions from the prompt

The later request specified the organizer repository and creating the participant branch from organizer main when absent. Commits, uploads, merges and pull requests await explicit authorization.

