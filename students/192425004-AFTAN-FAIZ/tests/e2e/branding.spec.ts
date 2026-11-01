import { test, expect } from "@playwright/test";
test("NYAVERIS AI branding stays consistent on desktop and mobile", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle(
    "NYAVERIS AI — Fairness You Can Trace. Trust You Can Prove.",
  );
  await expect(page.locator(".landing-nav .brand")).toHaveText("NYAVERIS AI");
  await expect(page.locator(".brand-tagline")).toHaveText(
    "Fairness You Can Trace. Trust You Can Prove.",
  );
  await expect(page.locator("body")).not.toContainText(/FairShift|Saakshi/i);
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "NYAVERIS AI home" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await page.goto("/");
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(page.locator(".landing-nav .brand")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".local/nyaveris-landing-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Explore worker demo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Good to see you/ }),
  ).toBeVisible();
  await expect(page.locator(".welcome-banner")).toContainText(
    "Fairness You Can Trace. Trust You Can Prove.",
  );
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.locator(".sidebar .brand")).toBeVisible();
  await expect(page.locator(".sidebar .brand")).toHaveText("NYAVERIS AI");
  await page.getByRole("link", { name: "My pay", exact: true }).click();
  await expect(page.locator(".page-heading .eyebrow")).toContainText(
    "NYAVERIS AI",
  );
  await expect(page.locator(".workspace-footer")).toContainText("NYAVERIS AI");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: ".local/nyaveris-dashboard-desktop.png",
    fullPage: true,
  });
});
