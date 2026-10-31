import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1366, height: 860 }, isMobile: false, hasTouch: false });

test("pitch deck navigates with the keyboard and keeps the slide in the URL", async ({ page }) => {
  await page.goto("/pitch");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fair work. Fair pay. Your voice.");
  await expect(page.getByText("01 / 17")).toBeVisible();

  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("02 / 17")).toBeVisible();
  await expect(page).toHaveURL(/#problem$/);

  await page.keyboard.press("End");
  await expect(page.getByText("17 / 17")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next slide" })).toBeDisabled();

  await page.keyboard.press("Home");
  await expect(page.getByText("01 / 17")).toBeVisible();
});

test("pitch deck opens on a linked slide and embeds the live demo at a real phone size", async ({ page }) => {
  await page.goto("/pitch#demo");
  await expect(page.getByRole("heading", { level: 1, name: "Try it right here" })).toBeVisible();
  const demo = page.frameLocator('iframe[title="Worker app demo"]');
  await expect(demo.getByRole("button", { name: /Ramesh/ })).toBeVisible();
  expect(await demo.locator("html").evaluate(() => window.innerWidth)).toBe(390);
});

test("the full-screen button switches to exit and back", async ({ page }) => {
  await page.goto("/pitch");
  await page.getByRole("button", { name: "Full screen" }).click();
  await page.getByRole("button", { name: "Exit full screen" }).click();
  await expect(page.getByRole("button", { name: "Full screen" })).toBeVisible();
});

test("every pitch slide has no accessibility violations", async ({ page }) => {
  test.setTimeout(120_000); // 17 full axe scans
  await page.goto("/pitch");
  for (let i = 0; i < 17; i++) {
    await page.waitForTimeout(450); // let the entrance animation finish before measuring contrast
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .exclude("iframe")
      .analyze();
    expect(results.violations.map((v) => `slide ${i + 1} ${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual(
      [],
    );
    await page.keyboard.press("ArrowRight");
  }
});
