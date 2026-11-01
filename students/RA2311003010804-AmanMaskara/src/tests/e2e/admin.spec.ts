import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });
test.use({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false });

async function expectNoA11yViolations(page: Page) {
  await expect(page).toHaveTitle(/FairShift/);
  await page.waitForTimeout(600);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
}

async function loginAs(page: Page, name: RegExp) {
  await page.goto("/login");
  await page.getByRole("button", { name }).first().click();
  await page.waitForURL(/\/(w|a)(\?welcome=1)?$/);
}

test("overview shows KPIs, attention items and charts", async ({ page }) => {
  await loginAs(page, /Priya/);
  await expect(page.getByRole("heading", { name: "Needs attention" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Workers present per day/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "AI transparency" })).toBeVisible();
  await expectNoA11yViolations(page);
});

test("a worker's report reaches the admin, and the status change reaches the worker", async ({ browser }) => {
  test.setTimeout(90_000); // drives two browsers end to end
  const worker = await (await browser.newContext()).newPage();
  await loginAs(worker, /Ramesh/);
  await worker.goto("/w/report");
  await worker.getByRole("button", { name: "Heat" }).click();
  await worker.getByRole("checkbox", { name: "Hide my name" }).uncheck();
  await worker.getByRole("button", { name: "Send report" }).click();
  await worker.waitForURL(/\/w\/report\/haz-/);
  const reportUrl = worker.url().split("?")[0];

  const admin = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await loginAs(admin, /Priya/);
  await admin.goto("/a/hazards");
  await expectNoA11yViolations(admin);
  const heat = admin.getByRole("heading", { name: "Heat", exact: true });
  const card = admin.getByTestId("hazard-card").filter({ has: heat }).filter({ hasText: "Ramesh Kumar" });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Start work" }).click();
  await expect(
    admin
      .getByRole("region", { name: /In progress/ })
      .getByTestId("hazard-card")
      .filter({ has: heat })
      .filter({ hasText: "Ramesh Kumar" }),
  ).toBeVisible();

  await worker.goto(reportUrl);
  await expect(worker.getByText("In progress").first()).toBeVisible();
});

test("people page separates site conditions from individual risk, and approves a work certificate", async ({
  page,
}) => {
  await loginAs(page, /Priya/);
  await page.goto("/a/people");
  await expect(page.getByRole("heading", { name: "Site conditions" })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("rowheader", { name: /Ramesh Kumar/ })).toBeVisible();
  // The menu's headcount loads on its own, after the page.
  await expect(page.getByText(/^\d+ of 18 on duty$/).first()).toBeVisible();
  await expectNoA11yViolations(page);

  // Only requests wait up top; once approved, the certificate link sits with the worker's row (or card on phones).
  const approvals = page.locator("#certificates");
  await approvals
    .getByRole("listitem")
    .filter({ hasText: "Venkat Rao" })
    .getByRole("button", { name: "Approve and sign" })
    .click();
  await expect(approvals.getByText("Venkat Rao")).toBeHidden();
  const venkat = page.getByRole("row").or(page.getByRole("listitem")).filter({ hasText: "Venkat Rao" });
  await venkat.getByRole("link", { name: "View certificate" }).click();
  await expect(page.getByRole("heading", { name: "Certificate of work" })).toBeVisible();
  await expect(page.getByText(/Venkat Rao, Carpenter, worked \d+ days for BuildRight Constructions/)).toBeVisible();
  await expectNoA11yViolations(page);
});

test("dismissing a hazard needs a reason, which the worker then sees", async ({ page }) => {
  await loginAs(page, /Priya/);
  await page.goto("/a/hazards");
  const card = page.locator("#haz-c4");
  await card.getByRole("button", { name: "Dismiss" }).click();
  const dialog = page.getByRole("dialog", { name: "Close without fixing" });
  await expect(dialog.getByRole("button", { name: "Close report" })).toBeDisabled();
  await dialog.getByRole("radio", { name: "Already fixed" }).check();
  await dialog.getByRole("button", { name: "Close report" }).click();
  await expect(page.getByRole("region", { name: /Closed/ }).locator("#haz-c4")).toBeVisible();
});

test("feedback page hides small groups, shows only issues with 5+ signers, and offers a brief", async ({ page }) => {
  await loginAs(page, /Priya/);
  await page.goto("/a/feedback");
  await expect(page.getByRole("heading", { name: "Issues raised together" })).toBeVisible();
  await expect(page.getByText(/Overtime list is announced at 6 pm/)).toBeVisible();
  await expect(page.getByText(/No shade or rest area/)).toHaveCount(0); // 3 signers: invisible to management
  await expect(page.getByText(/Groups smaller than 5 are hidden/)).toBeVisible();
  await page.getByRole("button", { name: "Generate brief" }).click();
  await expect(page.getByText(/workers are on site now/)).toBeVisible();
  await expectNoA11yViolations(page);
});

test("payroll exports a CSV only for admins", async ({ page, request }) => {
  expect((await request.get("/api/payroll")).status()).toBe(401);
  await loginAs(page, /Priya/);
  await page.goto("/a/payroll");
  await expect(page.getByRole("heading", { name: "FairPay Sentinel" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Ramesh Kumar/ }).getByText("Possible shortfall ₹907")).toBeVisible();
  await expectNoA11yViolations(page);
  const template = await page.request.get("/api/payroll/template");
  expect(await template.text()).toContain("paidOvertimeHours");
  const csv = await page.request.get("/api/payroll");
  expect(csv.headers()["content-type"]).toContain("text/csv");
  const text = await csv.text();
  expect(text.split("\r\n")[0]).toContain("Overtime hours");
  expect(text).toContain("Ramesh Kumar");
});

test("sites page lists sector rules and kiosk links", async ({ page }) => {
  await loginAs(page, /Priya/);
  await page.goto("/a/sites");
  await expect(page.getByText(/8h\/day · 48h\/week · OT 2×/)).toBeVisible();
  await expectNoA11yViolations(page);
});

test("manual pay entry from presets, then marking the gap paid clears it", async ({ page }) => {
  await loginAs(page, /Priya/);
  await page.goto("/a/payroll");
  await page.getByRole("button", { name: "Record pay for one worker" }).click();
  await page.locator("#paid-worker").selectOption({ label: "Arun Yadav (#1002)" });
  // Paid in full matches what is due exactly, whatever the odd minutes.
  await expect(page.getByText("Matches what is due")).toBeVisible();
  await page.getByText("Overtime not paid").click();
  await expect(page.getByText(/less than due/)).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const row = page.getByRole("row", { name: /Arun Yadav/ });
  await expect(row.getByText(/Possible shortfall/)).toBeVisible();
  await row.getByRole("button", { name: "Mark the gap paid for Arun Yadav" }).click();
  await page.getByRole("button", { name: /I have paid/ }).click();
  await expect(row.getByText(/Gap paid/)).toBeVisible();
});

test("paid in full from a worker's own row matches FairPay Sentinel", async ({ page }) => {
  await loginAs(page, /Priya/);
  await page.goto("/a/payroll");
  const row = page.getByRole("row", { name: /Murali Krishnan/ });
  await row.getByRole("button", { name: "Record pay for Murali Krishnan" }).click();
  await expect(page.locator("#paid-worker")).toHaveValue("w1015");
  await expect(page.getByText("Matches what is due")).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(row.getByText("Matches")).toBeVisible();
});

test("a worker adds a skill, the admin verifies it", async ({ browser }) => {
  test.setTimeout(90_000);
  const worker = await (await browser.newContext()).newPage();
  await loginAs(worker, /Ramesh/);
  await worker.goto("/w/skills");
  await worker.getByRole("button", { name: "Add a skill" }).click();
  await worker.getByLabel("Skill or training").fill("Bar bending (e2e)");
  await worker.getByLabel("Given by").fill("ITI Pune");
  await worker.getByLabel("Completed on").fill("2025-02-01");
  await worker.getByRole("button", { name: "Save skill" }).click();
  await expect(
    worker.getByRole("listitem").filter({ hasText: "Bar bending (e2e)" }).getByText("Pending"),
  ).toBeVisible();

  const admin = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await loginAs(admin, /Priya/);
  await admin.goto("/a/people");
  const card = admin.getByRole("listitem").filter({ hasText: "Bar bending (e2e)" });
  await card.getByRole("button", { name: "Verify" }).click();
  await expect(card).toHaveCount(0);

  await worker.reload();
  await expect(
    worker.getByRole("listitem").filter({ hasText: "Bar bending (e2e)" }).getByText("Verified"),
  ).toBeVisible();
});

test("pay three workers in one checkout: add bank details, the worker confirms, pay on the checkout page", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000); // drives the employer and the worker
  await loginAs(page, /Priya/);
  await page.goto("/a/payroll");
  await expect(page.getByText("Simulated checkout")).toBeVisible();

  // Valli has no bank details yet, so she can't be ticked until they are added...
  const valliRow = page.getByRole("row", { name: /Valli Ammal/ });
  await expect(valliRow.getByRole("checkbox")).toHaveCount(0);
  await valliRow.getByRole("button", { name: "Add bank details" }).click();
  await expect(page.getByText(/is asked in their app to confirm/)).toBeVisible();
  await page.getByLabel("Account number").fill("1233943142");
  await page.getByLabel("IFSC").fill("icic0000009");
  await page.getByRole("button", { name: "Save bank details" }).click();
  await expect(valliRow.getByText("••••3142")).toBeVisible();
  // ...and then not until she confirms them in her own app.
  await expect(valliRow.getByText(/Waiting for the worker to confirm/)).toBeVisible();
  await expect(valliRow.getByRole("checkbox")).toHaveCount(0);

  const worker = await (await browser.newContext()).newPage();
  await worker.goto("/login");
  await worker.locator("#worker-code").fill("1017");
  await worker.locator("#worker-pin").fill("7101");
  await worker.getByRole("button", { name: "Log in", exact: true }).click();
  await worker.waitForURL(/\/w/);
  const card = worker.getByRole("region", { name: "Is this your bank account?" });
  await expect(card).toContainText("••••3142");
  await expectNoA11yViolations(worker);
  await card.getByRole("button", { name: "Yes, it's mine" }).click();
  await expect(worker.getByText(/Your pay will go to ••••3142/)).toBeVisible();

  await page.reload();
  await expect(valliRow.getByText(/Waiting for the worker/)).toHaveCount(0);
  await page.getByRole("checkbox", { name: /^Pay Venkat Rao/ }).check();
  await page.getByRole("checkbox", { name: /^Pay Ravi Sharma/ }).check();
  await page.getByRole("checkbox", { name: /^Pay Valli Ammal/ }).check();
  await expect(page.getByText(/^3 workers selected · ₹/)).toBeVisible();
  await page.getByRole("button", { name: "Pay with checkout" }).click();
  await expectNoA11yViolations(page);
  await page.getByRole("button", { name: /^Continue to checkout · ₹/ }).click();

  // The checkout page: one payment, split to each worker's bank account.
  await page.waitForURL(/\/a\/payroll\/checkout\/fs\d{6}_[a-f0-9]{12}$/);
  await expect(page.getByRole("heading", { name: "Simulated checkout" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Valli Ammal" })).toContainText("••••3142");
  await expectNoA11yViolations(page);
  await page.getByRole("button", { name: /^Pay ₹/ }).click();

  // Back on payroll: each payment is the worker's pay record, so FairPay Sentinel shows it as matching.
  await page.waitForURL(/\/a\/payroll\?m=/);
  await expect(page.getByRole("row", { name: /Venkat Rao/ }).getByText("Matches")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /^Pay Venkat Rao/ })).toHaveCount(0);
  await page.getByText(/^Checkout history/).click();
  await expect(page.getByText("3 paid · 0 not paid · 0 waiting")).toBeVisible();
  await expectNoA11yViolations(page);
});

test("a checkout left unpaid waits at the top, and cancelling it frees the worker", async ({ page }) => {
  await loginAs(page, /Priya/);
  await page.goto("/a/payroll");
  await page.getByRole("checkbox", { name: /^Pay Selvam Murugan/ }).check();
  await page.getByRole("button", { name: "Pay with checkout" }).click();
  await page.getByRole("button", { name: /^Continue to checkout · ₹/ }).click();
  await page.waitForURL(/\/a\/payroll\/checkout\//);
  await page.getByRole("link", { name: /Back to payroll/ }).click();

  const waiting = page.getByRole("region", { name: "Waiting for payment" });
  await expect(waiting.getByText(/Selvam Murugan/)).toBeVisible();
  await expect(waiting.getByRole("link", { name: "Continue payment" })).toBeVisible();
  await expect(waiting.getByText(/stuck on pending/)).toBeVisible();
  await expect(page.getByRole("row", { name: /Selvam Murugan/ }).getByText("Waiting for payment")).toBeVisible();
  await waiting.getByRole("button", { name: "Cancel" }).click();
  await expect(waiting).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: /^Pay Selvam Murugan/ })).toBeEnabled();
});
