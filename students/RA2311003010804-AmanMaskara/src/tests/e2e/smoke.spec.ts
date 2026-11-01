import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoA11yViolations(page: Page) {
  // Metadata streams in Next 16: wait for the title before measuring.
  await expect(page).toHaveTitle(/FairShift/);
  await page.waitForTimeout(400);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
}

async function demoLogin(page: Page, name: RegExp) {
  await page.goto("/login");
  await page.getByRole("button", { name }).first().click();
  // Login replaces history with home (?welcome=1, which the page then drops from the URL).
  await page.waitForURL(/\/(w|a)(\?welcome=1)?$/);
}

test("landing sends security headers and has no a11y violations", async ({ page }) => {
  const response = await page.goto("/");
  const headers = response!.headers();
  expect(headers["content-security-policy"]).toContain("nonce-");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'self'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-powered-by"]).toBeUndefined();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // What's inside: both interfaces' features, and the SDG 8 targets they serve.
  await expect(page.getByRole("heading", { name: "What's inside" })).toBeVisible();
  await expect(page.getByText("Pay checked against your hours")).toBeVisible();
  await expect(page.getByText("Who is on duty now")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Built for UN SDG 8" })).toBeVisible();
  await expectNoA11yViolations(page);
});

test("worker path: landing → language → login, in Tamil", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "I'm a worker" }).click();
  await expect(page).toHaveURL(/\/start$/);
  await expectNoA11yViolations(page);
  await page.getByRole("button", { name: /தமிழ்/ }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ta");
  await expectNoA11yViolations(page);
});

test("the language menu switches language in place, without a history entry", async ({ page }) => {
  await page.goto("/");
  await page.goto("/login");
  const before = await page.evaluate(() => history.length);
  await page.getByRole("button", { name: "Change language" }).click();
  await page.getByRole("menuitemradio", { name: /हिन्दी/ }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  expect(await page.evaluate(() => history.length)).toBe(before);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
});

test("the phone menu highlight follows its tab after the language changes", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /Priya/ }).first().click();
  await page.waitForURL(/\/a(\?welcome=1)?$/);
  const strip = page.locator("header nav ul");
  await strip.getByRole("link", { name: "Hazards" }).click();
  await page.waitForURL(/\/a\/hazards$/);
  await page.getByRole("button", { name: "Change language" }).click();
  await page.getByRole("menuitemradio", { name: /தமிழ்/ }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ta");
  // The tab labels change width; the green pill must sit exactly on the active tab again.
  const active = strip.locator("a[aria-current='page']");
  const pill = strip.locator("li[aria-hidden='true']");
  await expect
    .poll(async () => {
      const [a, p] = await Promise.all([active.boundingBox(), pill.boundingBox()]);
      if (!a || !p) return Infinity;
      return Math.max(Math.abs(a.x - p.x), Math.abs(a.width - p.width));
    })
    .toBeLessThan(2);
});

test("protected pages redirect to login without a session", async ({ page }) => {
  await page.goto("/w");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/a/hazards");
  await expect(page).toHaveURL(/\/login$/);
});

test("demo worker reaches the worker home with the earnings counter", async ({ page }) => {
  await demoLogin(page, /Ramesh/);
  await expect(page).toHaveURL(/\/w$/);
  await expect(page.getByRole("heading", { name: /Ramesh/ })).toBeVisible();
  await expect(page.getByTestId("earned-month")).toContainText("₹");
  await expect(page.getByRole("navigation", { name: "Main menu" }).first()).toBeVisible();
  await expectNoA11yViolations(page);
  // Login replaced the history entry: Back never returns to the PIN screen.
  await page.goBack();
  await expect(page).not.toHaveURL(/\/login/);
});

test("an old demo session never hijacks “I'm an employer”", async ({ page }) => {
  await demoLogin(page, /Ramesh/);
  await page.goto("/");
  await page.getByRole("link", { name: "I'm an employer" }).click();
  await expect(page).toHaveURL(/\/login\?role=admin$/);
  await expect(page.getByText(/signed in as Ramesh/)).toBeVisible();
  await expectNoA11yViolations(page);
  await page.getByRole("button", { name: "Use a different account" }).click();
  await expect(page).toHaveURL(/\/login\?role=admin$/);
  await expect(page.getByLabel("Email")).toBeVisible();
});

test("a worker cannot open admin pages", async ({ page }) => {
  await demoLogin(page, /Sunita/);
  await page.goto("/a");
  await expect(page).toHaveURL(/\/w$/);
});

test("both employers have demo logins and see their own organisation", async ({ page }) => {
  await demoLogin(page, /Priya/);
  await expect(page.getByText("BuildRight Constructions").filter({ visible: true })).toBeVisible();
  await expect(page.getByText("Open hazards", { exact: true })).toBeVisible();
  await expectNoA11yViolations(page);
  await page.context().clearCookies();
  await demoLogin(page, /Arjun/);
  await expect(page.getByText("City Care Hospital").filter({ visible: true })).toBeVisible();
});

test("unknown pages and tampered share links get friendly pages, not raw errors", async ({ page }) => {
  await page.goto("/does-not-exist");
  await expect(page.getByRole("heading", { name: "We could not find this page" })).toBeVisible();
  await expectNoA11yViolations(page);
  await page.goto("/passport/eyJmYWtlIjp0cnVlfQ.forged");
  await expect(page.getByRole("heading", { name: "This passport could not be verified" })).toBeVisible();
  await page.goto("/certificate/eyJmYWtlIjp0cnVlfQ.forged");
  await expect(page.getByRole("heading", { name: "This certificate could not be verified" })).toBeVisible();
  await expectNoA11yViolations(page);
});

test("wrong PIN shows a friendly error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Enter your code").fill("1001");
  await page.getByLabel("Enter PIN").fill("9999");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Wrong code or PIN" })).toBeVisible();
});
