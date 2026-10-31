import { test, expect, type Page } from "@playwright/test";

async function open(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore worker demo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Good to see you/ }),
  ).toBeVisible({ timeout: 15000 });
  await page.locator(".assistant-fab").click();
  await expect(page.locator(".assistant-response")).toBeVisible();
}

test("Saarthi follows up using authorized records and opens the real next action", async ({
  page,
}) => {
  await open(page);
  await page
    .getByLabel("Ask Saarthi AI", { exact: true })
    .fill("Explain my last five shifts.");
  const answer = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/assistant") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Send question", exact: true })
    .click();
  const response = await answer;
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.intent).toBe("recent_shifts");
  expect(body.explanation).toContain("Shifts considered");
  expect(body.explanation).toContain("Overtime hours");
  await expect(page.locator(".assistant-history summary")).toHaveText(
    "Earlier questions",
  );
  await page
    .getByRole("button", { name: "View payroll details", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app\/pay$/);
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("all quick topics receive the correct response and navigate to an available workflow", async ({
  page,
}) => {
  await open(page);
  for (const [topic, path] of [
    ["pay", "pay"],
    ["safety", "report"],
    ["rest", "rest"],
    ["cases", "cases"],
  ]) {
    const response = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/assistant") && r.request().method() === "POST",
    );
    await page
      .locator(".assistant-topics button")
      .nth(["pay", "safety", "rest", "cases"].indexOf(topic))
      .click();
    const answer = await (await response).json();
    expect(answer.topic).toBe(topic);
    expect(answer.actionPath).toBe("/app/" + path);
    await page
      .getByRole("button", { name: answer.nextAction, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp("/app/" + path + "$"));
    await page.locator(".assistant-fab").click();
    await expect(page.locator(".assistant-response")).toBeVisible();
  }
});

test("assistant request failures show a retry and conversation can be cleared", async ({
  page,
}) => {
  await page.route(
    "**/api/assistant",
    (route) =>
      route.fulfill({
        status: 503,
        json: { error: "Assistance temporarily unavailable. Retry." },
      }),
    { times: 1 },
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore worker demo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Good to see you/ }),
  ).toBeVisible();
  await page.locator(".assistant-fab").click();
  await expect(page.getByRole("alert")).toContainText(
    "Assistance temporarily unavailable",
  );
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator(".assistant-response")).toBeVisible();
  await page
    .getByRole("button", { name: "Clear conversation", exact: true })
    .click();
  await expect(page.locator(".assistant-response")).not.toBeVisible();
  await expect(page.getByLabel("Ask Saarthi AI", { exact: true })).toHaveValue(
    "",
  );
});

test("RestGuard groups conflicts without negative rest or QA location labels and offers schedule review", async ({
  page,
  request,
}) => {
  test.skip(
    process.env.QA_ISOLATED !== "true",
    "Creates shifts only in the isolated synthetic SQL fixture",
  );
  const session = await request.post("/api/demo-session", {
    data: { role: "admin", sector: "construction" },
  });
  expect(session.ok()).toBeTruthy();
  const headers = {
    Authorization: `Bearer ${(await session.json()).access_token}`,
  };
  let shortId = "";
  for (const [start, end] of [
    ["08:00", "20:00"],
    ["09:00", "10:00"],
  ]) {
    const response = await request.post("/api/shifts", {
      headers,
      data: {
        organization_id: "10000000-0000-4000-8000-000000000001",
        worker_id: "20000000-0000-4000-8000-000000000001",
        starts_at: `2027-02-02T${start}:00+05:30`,
        ends_at: `2027-02-02T${end}:00+05:30`,
        break_minutes: 0,
        location: "UI review synthetic regression",
      },
    });
    expect(response.ok()).toBeTruthy();
    shortId = (await response.json()).data;
  }
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore employer demo", exact: true })
    .click();
  await expect(page.locator(".workspace-tag")).toContainText("Buildwell");
  await page.getByRole("link", { name: "RestGuard", exact: true }).click();
  const group = page.locator(".risk-item").filter({
    has: page.getByRole("heading", {
      name: "Overlapping shifts",
      exact: true,
    }),
  });
  await expect(group).toHaveCount(1);
  await group.locator("summary").click();
  await expect(group).toContainText("1h overlapping shifts");
  await expect(page.locator("main")).not.toContainText(
    "UI review synthetic regression",
  );
  await page
    .getByLabel("Shift to review", { exact: true })
    .selectOption(shortId);
  await expect(page.locator(".whatif-card")).toContainText(
    "Scheduling conflict",
  );
  await expect(page.locator(".whatif-card")).not.toContainText(
    /-\d+(\.\d+)?h rest/i,
  );
  await group
    .getByRole("button", { name: "Review schedule", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app\/shifts$/);
});
