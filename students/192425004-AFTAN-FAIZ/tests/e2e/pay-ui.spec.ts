import { test, expect } from "@playwright/test";
test("worker requests review in UI and employer responds before worker closes it", async ({
  page,
  request,
}) => {
  const login = await request.post("/api/demo-session", {
    data: { role: "admin", sector: "construction" },
  });
  expect(login.ok()).toBeTruthy();
  const token = (await login.json()).access_token;
  const headers = { Authorization: `Bearer ${token}` };
  const marker = `UI review ${Date.now()}`;
  const created = await request.post("/api/shifts", {
    headers,
    data: {
      id: null,
      organization_id: "10000000-0000-4000-8000-000000000001",
      worker_id: "20000000-0000-4000-8000-000000000001",
      starts_at: "2026-10-22T08:00:00+05:30",
      ends_at: "2026-10-22T18:30:00+05:30",
      break_minutes: 30,
      location: marker,
    },
  });
  expect(created.ok()).toBeTruthy();
  const shiftId = (await created.json()).data;
  expect(
    (
      await request.post("/api/payroll", {
        headers,
        data: {
          shift_id: shiftId,
          gross_paise: 95000,
          note: "Synthetic payroll for browser form verification.",
        },
      })
    ).ok(),
  ).toBeTruthy();
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore worker demo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Good to see you/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "My pay", exact: true }).click();
  const pay = page.locator(".pay-record").filter({ hasText: marker });
  await pay.getByRole("button", { name: "Confirm hours", exact: true }).click();
  await expect(
    pay.getByRole("button", { name: "Request pay review", exact: true }),
  ).toBeVisible();
  await pay
    .getByRole("button", { name: "Request pay review", exact: true })
    .click();
  await page
    .getByLabel("Tell us what needs a review", { exact: true })
    .fill(`${marker}: please check my overtime calculation.`);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Request pay review", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(pay).toContainText("Awaiting review");
  await page
    .locator(".demo-strip")
    .getByRole("button", { name: "Employer command center" })
    .click();
  await expect(page.locator(".workspace-tag")).toContainText(
    "Employer command center",
  );
  await page.getByRole("link", { name: /Pay reviews/ }).click();
  const review = page.locator(".case-card").filter({ hasText: marker });
  await review
    .getByRole("button", { name: "Review & respond", exact: true })
    .click();
  await page
    .getByLabel("Corrected gross amount (₹)", { exact: true })
    .fill("1100");
  await page
    .getByLabel("Explanation / action taken", { exact: true })
    .fill(
      "Verified ten payable hours, including two overtime hours. Payroll corrected to ₹1,100.",
    );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .locator(".demo-strip")
    .getByRole("button", { name: "Worker workspace" })
    .click();
  await expect(page.locator(".workspace-tag")).toContainText(
    "Worker workspace",
  );
  await page.getByRole("link", { name: /My cases/ }).click();
  const workerCase = page.locator(".case-card").filter({ hasText: marker });
  await workerCase
    .getByRole("button", { name: "Confirm resolution", exact: true })
    .click();
  await expect(workerCase).toContainText("Closed");
  await workerCase
    .getByRole("button", { name: "Fairness Replay", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Worker confirmed resolution",
  );
  await expect(page.getByRole("dialog")).toContainText("₹1,100");
});
