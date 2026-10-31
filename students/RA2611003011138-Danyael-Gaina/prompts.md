# Key development prompts

These are selected requests from the FairShift development sessions, edited for clarity and grouped by task. They preserve the intent of the original requests; they are not a verbatim conversation transcript.

## Implementation and iteration with Claude Code

### 1. Explain the two industry use cases

> Write a clear README that explains how FairShift works for both a construction site and a college campus. Include the architecture and setup steps. Check Tamil KPI labels for wrapping, and add read-aloud controls to the main admin actions.

### 2. Build a welcoming language flow

> Create a minimal onboarding experience with a smooth greeting animation and language selection. Keep it easy to follow on a phone, and make the rest of the app feel consistent with the onboarding.

### 3. Make language switching easy to find

> Use a familiar translation-icon button for language settings instead of putting every language in the header. Where possible, suggest the user's language, while keeping the choice explicit and easy to change.

### 4. Give each demo a useful introduction

> Whenever someone selects a worker or admin demo, show that role's welcome tour. Keep it skippable, and provide a way to replay the introduction.

### 5. Keep reporting usable during a live demo

> Add an example safety report and a deterministic triage result so the reporting flow can still be demonstrated if the live AI service is unavailable. Refresh the admin queue so a report submitted from a phone appears without a manual page reload.

### 6. Make the payslip easier to understand

> Put take-home pay above the earnings and deductions. Keep the read-aloud button with the total in one card, with a simple divider before the explanation. Show the arithmetic behind each pay line.

### 7. Review reliability and accessibility

> Review the data-reset behavior, concurrent check-ins, feedback retries after a failed save, microphone cleanup on navigation, and escaped passport signing keys. Fix the root causes and add focused tests. Also check keyboard behavior, focus after onboarding and report submission, and security headers on the deployed HTML.

### 8. Improve Hindi and Tamil speech

> Make text-to-speech read only the application text, not the instruction used to generate the speech. Check Hindi and Tamil playback, remove the noise at the end of the clip, and avoid reusing an outdated cached response.

### 9. Polish real phone layouts

> Check the check-in status, speaker controls, overtime labels, and admin cards on narrow and landscape screens. Keep spacing and corner radii consistent, and fix wrapping or alignment problems without hiding important information.

### 10. Keep the visual system consistent

> Give both light and dark modes the same level of polish. Align the header with the page cards, balance the logo and controls, and make sure the installed web app uses the current icon.

## Final review and feature work with Codex

### 11. Make daily pay explorable

> Add a calendar within the pay page. Selecting a day should show recorded hours, overtime, deductions, and the estimated amount for that day, with read-aloud available. Let admins announce days off, but keep these as schedule notices; payroll must still follow recorded shifts.

### 12. Make navigation work at every width

> When the admin sections do not fit across the screen, use a bottom navigation bar instead of asking desktop users to swipe sideways. Reflow the at-risk worker information on narrow screens, and keep the selected navigation state clear.

### 13. Make language choice work before the demo

> If Hindi or Tamil is selected before entering a demo, the onboarding should still play in that language. Use clear selection and confirmation controls, keep speaker previews optional, and preserve the current language if the user cancels.

### 14. Finish the worker's follow-up loop

> Add worker confirmation or reopening after a reported safety fix, compare calculated pay against separately recorded payments, and show recurring site hazards without adding identities to anonymous reports. Give important actions a persistent receipt or confirmation, with translations, audio, validation, and tests.

### 15. Verify the whole submission

> Check the current source from a fresh setup. Confirm that tests, type checking, lint, and both deployment builds pass. Review the README, environment example, screenshots, and submission files so the project can be run without private files or credentials.
