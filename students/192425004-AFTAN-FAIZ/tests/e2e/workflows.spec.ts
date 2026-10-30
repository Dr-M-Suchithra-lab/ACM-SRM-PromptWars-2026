import { test, expect, type APIRequestContext } from "@playwright/test";
const org = "10000000-0000-4000-8000-000000000001";
const worker = "20000000-0000-4000-8000-000000000001";
async function login(
  api: APIRequestContext,
  role: "worker" | "admin",
  sector = "construction",
) {
  const r = await api.post("/api/demo-session", { data: { role, sector } });
  expect(r.ok()).toBeTruthy();
  return (await r.json()).access_token as string;
}
test("worker navigation, Fairness Replay, Tamil fallback and narrow mobile layout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore worker demo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Good to see you/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "See pay breakdown" }).click();
  await expect(
    page.getByRole("heading", { name: "Your hours. Your earnings. In sync." }),
  ).toBeVisible();
  await page
    .locator(".pay-record")
    .filter({ hasText: "26 Oct 2026" })
    .getByRole("button", { name: "Fairness Replay", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("PROOFLOOP");
  await expect(page.getByRole("dialog")).toContainText("Hours confirmed");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByLabel("Language", { exact: true }).selectOption("ta");
  await expect(
    page.getByRole("heading", { name: "உங்கள் நேரம். உங்கள் ஊதியம்." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "ஊதியத்தை விளக்கவும்", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("AI கிடைக்கவில்லை");
  await expect(page.getByRole("dialog")).toContainText(
    "உறுதிப்படுத்திய வேலை நேரம்",
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.setViewportSize({ width: 360, height: 800 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "முகப்பு", exact: true }).click();
  await expect(page.getByRole("heading", { name: /வணக்கம்/ })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: ".local/worker-mobile.png", fullPage: true });
  expect(errors).toEqual([]);
});
test("persisted pay review, employer correction and worker confirmation", async ({
  request,
}) => {
  const a = await login(request, "admin"),
    w = await login(request, "worker");
  const ah = { Authorization: `Bearer ${a}` },
    wh = { Authorization: `Bearer ${w}` };
  const create = await request.post("/api/shifts", {
    headers: ah,
    data: {
      id: null,
      organization_id: org,
      worker_id: worker,
      starts_at: "2026-10-23T08:00:00+05:30",
      ends_at: "2026-10-23T18:30:00+05:30",
      break_minutes: 30,
      location: `QA payroll ${Date.now()}`,
    },
  });
  expect(create.ok()).toBeTruthy();
  const id = (await create.json()).data;
  expect(
    (
      await request.post("/api/shifts/confirm", {
        headers: wh,
        data: { shift_id: id },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await request.post("/api/payroll", {
        headers: ah,
        data: {
          shift_id: id,
          gross_paise: 95000,
          note: "Synthetic QA payroll for end-to-end verification.",
        },
      })
    ).ok(),
  ).toBeTruthy();
  const review = await request.post("/api/reviews", {
    headers: wh,
    data: {
      shift_id: id,
      reason: "Please review the overtime amount for my ten-hour shift.",
    },
  });
  expect(review.ok()).toBeTruthy();
  const dispute = (await review.json()).data;
  const duplicate = await request.post("/api/reviews", {
    headers: wh,
    data: { shift_id: id, reason: "A duplicate review should be blocked." },
  });
  expect(duplicate.status()).toBe(409);
  const denied = await request.post("/api/reviews/resolve", {
    headers: wh,
    data: {
      dispute_id: dispute,
      corrected_paise: 110000,
      explanation: "Unauthorized worker correction must fail.",
    },
  });
  expect(denied.status()).toBe(403);
  expect(
    (
      await request.post("/api/reviews/resolve", {
        headers: ah,
        data: {
          dispute_id: dispute,
          corrected_paise: 110000,
          explanation:
            "Overtime verified. Corrected gross from ₹950 to ₹1,100.",
        },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await request.post("/api/reviews/confirm", {
        headers: wh,
        data: { dispute_id: dispute },
      })
    ).ok(),
  ).toBeTruthy();
  const result = await (
    await request.get("/api/workspace", { headers: wh })
  ).json();
  expect(
    result.pay_disputes.find((d: { id: string }) => d.id === dispute).status,
  ).toBe("closed");
  expect(
    result.pay.find((p: { shiftId: string }) => p.shiftId === id)
      .discrepancyPaise,
  ).toBe(0);
  const events = result.dispute_events.filter(
    (e: { shift_id: string }) => e.shift_id === id,
  );
  expect(events.map((e: { event_type: string }) => e.event_type)).toEqual(
    expect.arrayContaining([
      "schedule_saved",
      "hours_confirmed",
      "payroll_recorded",
      "review_requested",
      "employer_response",
      "worker_confirmed_resolution",
      "fairness_check",
    ]),
  );
});
test("anonymous concern UI, secure tracking and admin update", async ({
  page,
  request,
}) => {
  await page.goto("/safety");
  await page.getByLabel("Organization", { exact: true }).selectOption(org);
  await page
    .getByLabel("What happened?")
    .fill(
      "The scaffolding guardrail near the east entrance is loose. Please inspect the connections before work.",
    );
  await page
    .getByRole("button", { name: "Submit anonymous concern", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Concern submitted", exact: true }),
  ).toBeVisible();
  const receipt = page.locator(".credential-receipt");
  const reference = (await receipt.locator("dd").nth(0).innerText()).trim(),
    token = (await receipt.locator("dd").nth(1).innerText()).trim();
  expect(token).toMatch(/^[a-f0-9]{64}$/);
  await page
    .getByRole("button", { name: "Track a concern", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "Check status" }).click();
  await expect(page.locator(".tracked-case")).toContainText("Submitted");
  const a = await login(request, "admin");
  const state = await (
    await request.get("/api/workspace", {
      headers: { Authorization: `Bearer ${a}` },
    })
  ).json();
  const report = state.safety_reports.find(
    (s: { reference: string }) => s.reference === reference,
  );
  expect(report).not.toHaveProperty("worker_id");
  expect(report).not.toHaveProperty("token_hash");
  expect(
    (
      await request.post("/api/safety/update", {
        headers: { Authorization: `Bearer ${a}` },
        data: {
          report_id: report.id,
          status: "acknowledged",
          note: "Site supervisor notified. Inspection assigned for this guardrail.",
        },
      })
    ).ok(),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Check status" }).click();
  await expect(page.locator(".tracked-case")).toContainText("Acknowledged");
  expect(
    (
      await request.post("/api/safety/track", {
        data: { reference, token: "0".repeat(64) },
      })
    ).status(),
  ).toBe(404);
});
test("hospital RestGuard what-if updates instantly and preserves original until confirmed", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore employer demo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Overview.", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Demo industry").selectOption("healthcare");
  await expect(page.locator(".workspace-tag")).toContainText(
    "Lotus Care Hospital",
  );
  await page.getByRole("link", { name: "RestGuard", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Rest window warning", exact: true }),
  ).toBeVisible();
  const card = page.locator(".whatif-card");
  await expect(card).toContainText("6h rest window");
  await page.getByRole("slider", { name: "Schedule what-if" }).fill("18");
  await expect(card).toContainText("Rest policy met");
  await expect(card).toContainText("11h rest window");
  await expect(
    page.getByRole("button", { name: "Confirm schedule change" }),
  ).toBeEnabled();
  await page.screenshot({
    path: ".local/restguard-desktop.png",
    fullPage: true,
  });
});
test("keyboard access and Hindi navigation", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore worker demo", exact: true })
    .click();
  await expect(page.locator(".workspace-tag")).toContainText("Buildwell");
  await page.getByLabel("Language", { exact: true }).selectOption("hi");
  await expect(page.getByRole("heading", { name: /नमस्ते/ })).toBeVisible();
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() => document.activeElement?.tagName !== "BODY"),
  ).toBe(true);
});
