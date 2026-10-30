import "dotenv/config";
import { test, expect } from "@playwright/test";

test("sign-in waits for Supabase configuration before allowing submission", async ({
  page,
}) => {
  let release!: () => void;
  const configured = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/config", async (route) => {
    await configured;
    await route.continue();
  });
  await page.goto("/login");
  const submit = page.getByRole("button", { name: "Sign in", exact: true });
  try {
    await expect(submit).toBeDisabled();
  } finally {
    release();
  }
  await expect(submit).toBeEnabled();
});

test("production domain supports sign-in, persisted sessions and both industry dashboards", async ({
  page,
  request,
  baseURL,
}) => {
  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();
  expect((await health.json()).status).toBe("ok");
  const config = await request.get("/api/config");
  expect(config.ok()).toBeTruthy();
  expect((await config.json()).url).toContain(".supabase.co");
  expect((await request.get("/api/workspace")).status()).toBe(401);
  await page.goto("/login");
  await expect(page).toHaveTitle(/NYAVERIS AI/);
  await page
    .getByLabel("Email address", { exact: true })
    .fill("construction.worker@demo.fairshift.example");
  if (!process.env.DEMO_PASSWORD)
    throw new Error(
      "Synthetic demonstration password is not configured for this verification",
    );
  // Avoid rendering the credential in a Playwright fill call log; local traces remain ignored.
  await page.getByLabel("Password", { exact: true }).evaluate((el, value) => {
    (el as HTMLInputElement).value = value;
  }, process.env.DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Good to see you/ }),
  ).toBeVisible();
  expect(new URL(page.url()).origin).toBe(new URL(baseURL!).origin);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /Good to see you/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "My pay", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your hours. Your earnings. In sync." }),
  ).toBeVisible();
  const pay = page.locator(".pay-record").filter({ hasText: "26 Oct 2026" });
  await expect(pay).toContainText("₹1,100");
  await expect(pay).toContainText("₹950");
  await page
    .locator(".demo-strip")
    .getByRole("button", { name: "Employer command center" })
    .click();
  await expect(page.locator(".workspace-tag")).toContainText(
    "Employer command center",
  );
  await page.getByRole("link", { name: "Workforce", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Workforce", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Demo industry").selectOption("healthcare");
  await expect(page.locator(".workspace-tag")).toContainText(
    "Lotus Care Hospital",
  );
  await page.getByRole("link", { name: "RestGuard", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Make room for recovery." }),
  ).toBeVisible();
  // The saved synthetic schedule may already have been corrected. Preview the
  // original challenge scenario without resetting or changing that schedule.
  await page.getByRole("slider", { name: "Schedule what-if" }).fill("13");
  await expect(page.locator(".whatif-card")).toContainText("6h rest window");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Sign in", exact: true }),
  ).toBeVisible();
});
