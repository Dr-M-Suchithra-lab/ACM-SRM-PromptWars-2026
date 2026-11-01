import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";

async function expectAccessible(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  mkdirSync(".local/optimization", { recursive: true });
  writeFileSync(
    `.local/optimization/axe-${new URL(page.url()).pathname.replaceAll("/", "_")}.json`,
    JSON.stringify(result.violations, null, 2),
  );
  expect(
    result.violations.map(({ id, nodes }) => ({
      id,
      nodes: nodes.map((node) => node.target),
    })),
  ).toEqual([]);
}

test("anonymous reporting hints are programmatically associated without changing the layout", async ({
  page,
}) => {
  await page.goto("/safety");
  const description = page.getByLabel("What happened?", { exact: true });
  await expect(description).toBeVisible();
  await expect(description).toHaveAccessibleDescription("20–4,000 characters");
  await expectAccessible(page);
  await page
    .getByRole("button", { name: "Track a concern", exact: true })
    .click();
  await expect(
    page.getByLabel("Secret access token", { exact: true }),
  ).toBeVisible();
  await expectAccessible(page);
});

test("pay review dialog supports labels, focus containment and keyboard dismissal", async ({
  page,
}) => {
  // This accessibility test opens but never submits a review. Keep the UI
  // fixture independent of already-open reviews in the shared synthetic demo.
  await page.route("**/api/workspace**", async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    const ids = new Set(
      data.shifts
        .filter((s: { starts_at: string }) =>
          s.starts_at.startsWith("2026-10-26"),
        )
        .map((s: { id: string }) => s.id),
    );
    data.pay_disputes = data.pay_disputes.filter(
      (d: { shift_id: string }) => !ids.has(d.shift_id),
    );
    await route.fulfill({ json: data });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore worker demo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Good to see you/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "My pay", exact: true }).click();
  const pay = page.locator(".pay-record").filter({ hasText: "26 Oct 2026" });
  await pay
    .getByRole("button", { name: "Request pay review", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByLabel("Tell us what needs a review", { exact: true }),
  ).toBeVisible();
  await expectAccessible(page);
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((node) => node.contains(document.activeElement)),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

test("employer safety, payroll and rest screens pass automated accessibility checks", async ({
  page,
}) => {
  await page.goto("/");
  const workspaceLoaded = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/workspace" && response.ok(),
  );
  await page
    .getByRole("button", { name: "Explore employer demo", exact: true })
    .click();
  await workspaceLoaded;
  await expect(page.locator(".workspace-tag")).toContainText(
    "Employer command center",
  );
  for (const name of [
    "Payroll intelligence",
    "Safety reports",
    "Organization",
  ]) {
    await page.getByRole("link", { name, exact: true }).click();
    await expectAccessible(page);
  }
  await page.getByLabel("Demo industry").selectOption("healthcare");
  await expect(page.locator(".workspace-tag")).toContainText(
    "Lotus Care Hospital",
  );
  await page.getByRole("link", { name: "RestGuard", exact: true }).click();
  await page.getByRole("slider", { name: "Schedule what-if" }).fill("13");
  await expect(page.locator(".whatif-card")).toContainText("6h rest window");
  await expectAccessible(page);
  await page.getByRole("slider", { name: "Schedule what-if" }).fill("18");
  await expect(page.locator(".whatif-card")).toContainText("Rest policy met");
  await expectAccessible(page);
});
