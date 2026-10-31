import { test, expect } from "@playwright/test";
test("demo controls have readable touch targets on desktop and mobile", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore employer demo", exact: true })
    .click();
  await expect(page.getByLabel("Demo industry")).toBeVisible({
    timeout: 15000,
  });
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 850 });
    for (const control of [
      page.getByLabel("Demo industry"),
      page.locator(".demo-strip button"),
    ]) {
      const box = await control.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(
        await control.evaluate((el) =>
          parseFloat(getComputedStyle(el).fontSize),
        ),
      ).toBeGreaterThanOrEqual(16);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
test("shift form explains invalid entries and persists a valid overnight shift", async ({
  page,
}) => {
  test.skip(
    process.env.QA_ISOLATED !== "true",
    "Mutations require the isolated synthetic PostgreSQL fixture",
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore employer demo", exact: true })
    .click();
  await expect(page.getByLabel("Demo industry")).toBeVisible();
  await page.getByRole("link", { name: "My shifts", exact: true }).click();
  await page.getByRole("button", { name: "Create shift", exact: true }).click();
  const dialog = page.getByRole("dialog"),
    start = dialog.locator("[name=starts_at]"),
    end = dialog.locator("[name=ends_at]");
  await start.fill("");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "complete start date and time",
  );
  await start.fill("2027-03-11T22:00");
  await end.fill("2027-03-04T06:30");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "later than shift start",
  );
  await end.fill("2027-03-12T06:30");
  await dialog
    .locator("[name=location]")
    .fill("Synthetic overnight regression");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await expect(page.locator("main")).toContainText(
    "Synthetic overnight regression",
  );
});
