import { writeFileSync, mkdirSync } from "node:fs";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("worker dashboard meets automated WCAG A/AA checks", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore worker demo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Good to see you/ }),
  ).toBeVisible();
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  mkdirSync(".local", { recursive: true });
  writeFileSync(".local/axe-results.json", JSON.stringify(result.violations));
  console.log(
    result.violations.map((v) => ({ id: v.id, nodes: v.nodes.length })),
  );
  expect(result.violations.map((v) => v.id)).toEqual([]);
});
