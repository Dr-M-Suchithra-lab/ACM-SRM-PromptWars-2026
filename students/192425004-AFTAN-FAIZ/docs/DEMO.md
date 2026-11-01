# NYAVERIS AI demonstration guide

Use the dedicated synthetic project. Open the deployed application when verified, or http://127.0.0.1:5173 locally. Demo actions persist; closing a case does not reset it. Keep the 26 October construction scenario open until the presentation. Automated tests create separate QA shifts, leaving that primary example available.

## First minute: Fairness Twin + ProofLoop

1. Click **Explore worker demo**. The construction workspace welcomes Arun Kumar.
2. The FairPay Twin shows ten payable hours and ₹1,100 expected versus ₹950 employer-recorded gross. The ₹150 difference comes from real persisted shifts, policy and payroll.
3. Open **Fairness Replay**. Show shift creation, worker-confirmed hours, employer payroll and the persisted configured-policy fairness check.
4. Open **My pay**, use the **26 Oct 2026** record, and click **Request pay review**. Submit a clear reason. The case persists in Supabase.
5. Use the demo role switch to enter **Employer command center**, then **Pay reviews**. Find the review, click **Review & respond**, set corrected gross to **1100**, and explain that the overtime component was verified.
6. Switch back to the worker, open **My cases**, inspect the response and choose **Confirm resolution**. The case closes only after that worker action.
7. Reopen Replay to show the previous ₹950, corrected ₹1,100, and confirmation history. Application roles cannot edit/delete those events.

## Anonymous concern to documented action

1. Open **Report concern** (or `/safety` while signed out). Choose the construction organization, equipment category and priority. Describe a synthetic loose guardrail without any names.
2. Submit. Save the random **case reference and secret token** privately. These are real access credentials; do not post them to public slides or LinkedIn.
3. Switch to the employer interface, open **Safety reports**, find the reference, and acknowledge the concern with an action note.
4. Return to anonymous tracking and enter both credentials. The acknowledgement and timestamp appear from persisted events. A wrong token returns a generic tracking failure.
5. Explain the sequential workflow: submitted → acknowledged → under review → action assigned → mitigation documented → closed. AI cannot dismiss or close a case.

## Hospital prevention

1. Enter the employer demo and change the industry to **Healthcare**. This signs into a separate hospital admin identity.
2. Open **RestGuard**. The overnight shift ends at **07:00**, while the next shift starts at **13:00**. Rest is **6h**; the configured minimum is **11h**.
3. Move the what-if slider to **18:00**. The result changes instantly to **11h / Rest policy met**, while the stored schedule remains unchanged.
4. Optionally click **Confirm schedule change** to persist it. The shift end moves by the same amount to preserve duration; the new end is on the following date. A saved schedule creates a ProofLoop event.

## Multilingual access and fallback

1. Switch language to **தமிழ்** or **हिन्दी**.
2. Navigate the worker dashboard, pay view and concern form. Open **Saarthi AI** and request a wage explanation.
3. With Gemini disabled, the assistant explicitly displays reliable text guidance in the selected language. It continues working if the AI provider is unavailable.
4. If a supported browser voice is installed, use **Read aloud**; visible text remains the fallback.

## Repeating a completed scenario

Do not erase or rewrite a closed case. Create a new synthetic shift in the employer's Shift Management, confirm it as the worker, record a lower payroll amount as the employer, and request a new review. Existing payroll corrections must use the review workflow. The seed includes a separate existing review for demonstration if needed.
