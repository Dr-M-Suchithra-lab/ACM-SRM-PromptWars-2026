import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function accessible(page: Page) {
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    scan.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
}
const isolated = process.env.QA_ISOLATED === "true";
async function bearer(page: Page) {
  return page.evaluate(() => {
    for (const storage of [localStorage, sessionStorage])
      for (const key of Object.keys(storage)) {
        if (key.endsWith("-auth-token")) {
          const value = JSON.parse(storage.getItem(key)!);
          if (value.access_token) return value.access_token as string;
        }
      }
    throw Error("Synthetic session unavailable");
  });
}
async function secret(page: Page, label: string, value: string) {
  await page.getByLabel(label, { exact: true }).evaluate((node, v) => {
    (node as HTMLInputElement).value = v;
  }, value);
}
async function register(
  page: Page,
  request: APIRequestContext,
  email: string,
  name: string,
) {
  await page.goto("/signup");
  await page.getByLabel("Full name", { exact: true }).fill(name);
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await secret(page, "Password", "synthetic journey passphrase");
  await secret(page, "Confirm password", "synthetic journey passphrase");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Check your email", exact: true }),
  ).toBeVisible();
  const response = await request.get("/__qa/mail", {
    headers: { "X-QA-Key": process.env.QA_FIXTURE_KEY! },
    params: { email },
  });
  expect(response.ok()).toBe(true);
  const { link } = await response.json();
  expect(typeof link === "string").toBe(true);
  await page.goto(link);
}
async function business(
  page: Page,
  name: string,
  email: string,
  industry = "construction",
) {
  await expect(
    page.getByRole("heading", { name: "Welcome to NYAVERIS AI", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Create My Business", exact: true })
    .click();
  for (const [label, value] of [
    ["Business name", name],
    ["Business email", email],
    ["Business location", "Isolated Test Site"],
    ["State", "Test State"],
    ["City", "Test City"],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel("Industry", { exact: true }).selectOption(industry);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Create Business", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Your workforce, in focus.",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".workspace-tag")).toContainText(name);
}
// This suite fails closed on an external URL; it must never mutate hosted demos.
test.beforeEach(async ({ baseURL }) => {
  if (!isolated || new URL(baseURL!).hostname !== "127.0.0.1")
    throw Error(
      "Functional mutation journey requires the isolated fixture server",
    );
});

test("new verified owner invites an employee; hours, payroll, dispute and ProofLoop persist through the real local backend", async ({
  page,
  browser,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await register(
    page,
    request,
    "owner-journey@example.test",
    "Synthetic Owner",
  );
  await business(
    page,
    "Synthetic Journey Business",
    "owner-journey@example.test",
  );
  await accessible(page);
  const settingsLink = page
    .locator(".sidebar")
    .getByRole("link", { name: "Organization", exact: true });
  await settingsLink.scrollIntoViewIfNeeded();
  await expect(settingsLink).toBeInViewport();
  await page.screenshot({
    path: ".local/audit-new-business-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Employees", exact: true }).click();
  await page
    .getByRole("button", { name: "Invite Employee", exact: true })
    .click();
  for (const [label, value] of [
    ["Employee name", "Synthetic Employee"],
    ["Employee email", "employee-journey@example.test"],
    ["Employee ID", "JOURNEY-001"],
    ["Department", "Operations"],
    ["Job title", "Site technician"],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page
    .getByRole("button", { name: "Save and invite", exact: true })
    .click();
  await expect(page.locator(".saas-workforce [role=status]")).toContainText(
    "Email delivery is not configured",
  );
  const invitation = await page
    .getByLabel("Private invitation link", { exact: true })
    .inputValue();
  await page
    .getByRole("button", { name: "Hide private link", exact: true })
    .click();
  const workerContext = await browser.newContext({
      baseURL: new URL(page.url()).origin,
    }),
    worker = await workerContext.newPage();
  worker.on("pageerror", (e) => errors.push(e.message));
  await worker.goto(invitation);
  await worker.getByRole("link", { name: "Sign up", exact: true }).click();
  await register(
    worker,
    request,
    "employee-journey@example.test",
    "Synthetic Employee",
  );
  await expect(
    worker.getByRole("button", { name: "Accept Invitation", exact: true }),
  ).toBeVisible();
  await worker
    .getByRole("button", { name: "Accept Invitation", exact: true })
    .click();
  await expect(
    worker.getByRole("heading", { name: /Good to see you/ }),
  ).toBeVisible();
  await worker.reload();
  await expect(worker.locator(".workspace-tag")).toContainText(
    "Synthetic Journey Business",
  );
  await page.goto("/app/shifts");
  await page.getByRole("button", { name: "Create shift", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Shift start", { exact: true })
    .fill("2026-11-05T08:00");
  await dialog
    .getByLabel("Shift end", { exact: true })
    .fill("2026-11-05T18:30");
  await dialog.getByLabel("Unpaid break (min)", { exact: true }).fill("30");
  await dialog
    .getByLabel("Site / department", { exact: true })
    .fill("Synthetic Journey Shift");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await worker.goto("/app/shifts");
  await worker
    .getByRole("row")
    .filter({ hasText: "Synthetic Journey Shift" })
    .getByRole("button", { name: "Confirm hours", exact: true })
    .click();
  await worker.reload();
  await expect(
    worker.getByRole("row").filter({ hasText: "Synthetic Journey Shift" }),
  ).toContainText("Worker confirmed");
  await page.reload();
  const row = page
    .getByRole("row")
    .filter({ hasText: "Synthetic Journey Shift" });
  await row.getByRole("button", { name: /Record|payroll|gross/i }).click();
  await page.getByLabel("Gross amount (₹)", { exact: true }).fill("950");
  await page
    .getByLabel("Explanation / action taken", { exact: true })
    .fill("Synthetic journey payroll verification.");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await worker.goto("/app/pay");
  const pay = worker
    .locator(".pay-record")
    .filter({ hasText: "Synthetic Journey Shift" });
  await expect(pay).toContainText("₹1,100");
  await expect(pay).toContainText("₹950");
  await pay
    .getByRole("button", { name: "Request pay review", exact: true })
    .click();
  await worker
    .getByLabel("Tell us what needs a review", { exact: true })
    .fill("Please review this synthetic overtime difference.");
  await worker
    .getByRole("dialog")
    .getByRole("button", { name: "Request pay review", exact: true })
    .click();
  await worker.reload();
  await expect(pay).toContainText("Awaiting review");
  await page.goto("/app/disputes");
  const review = page
    .locator(".case-card")
    .filter({ hasText: "Synthetic Journey Shift" });
  await review
    .getByRole("button", { name: "Review & respond", exact: true })
    .click();
  await page
    .getByLabel("Corrected gross amount (₹)", { exact: true })
    .fill("1100");
  await page
    .getByLabel("Explanation / action taken", { exact: true })
    .fill("Synthetic overtime verified and payroll corrected.");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await worker.goto("/app/cases");
  const ownCase = worker
    .locator(".case-card")
    .filter({ hasText: "Synthetic Journey Shift" });
  await ownCase
    .getByRole("button", { name: "Request clarification", exact: true })
    .click();
  await worker
    .getByLabel("Tell us what needs a review", { exact: true })
    .fill("Please clarify the synthetic overtime correction details.");
  await worker
    .getByRole("dialog")
    .getByRole("button", { name: "Request pay review", exact: true })
    .click();
  await expect(worker.getByRole("dialog")).not.toBeVisible();
  await expect(ownCase).toContainText("Awaiting review");
  await page.reload();
  await review
    .getByRole("button", { name: "Review & respond", exact: true })
    .click();
  await page
    .getByLabel("Corrected gross amount (₹)", { exact: true })
    .fill("1100");
  await page
    .getByLabel("Explanation / action taken", { exact: true })
    .fill("Synthetic clarification: the full overtime correction is recorded.");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await worker.reload();

  await ownCase
    .getByRole("button", { name: "Confirm resolution", exact: true })
    .click();
  await worker.reload();
  await expect(ownCase).toContainText("Closed");
  await ownCase
    .getByRole("button", { name: "Fairness Replay", exact: true })
    .click();
  await expect(worker.getByRole("dialog")).toContainText(
    "Worker confirmed resolution",
  );
  await worker.screenshot({
    path: ".local/audit-new-business-proofloop.png",
    fullPage: true,
  });
  await worker
    .getByRole("button", { name: "Close dialog", exact: true })
    .click();
  await worker.goto("/app/report");
  await worker
    .getByLabel("What happened?", { exact: true })
    .fill(
      "Synthetic journey hazard: an equipment guard needs inspection before the next shift.",
    );
  await worker
    .getByRole("button", { name: "Submit anonymous concern", exact: true })
    .click();
  await expect(
    worker.getByRole("heading", { name: "Concern submitted", exact: true }),
  ).toBeVisible();
  await worker
    .getByRole("button", { name: "Track a concern", exact: true })
    .last()
    .click();
  await worker
    .getByRole("button", { name: "Check status", exact: true })
    .click();
  await expect(worker.locator(".tracked-case")).toContainText("Submitted");
  await page.goto("/app/safety");
  const concern = page
    .locator(".case-card")
    .filter({ hasText: "Synthetic journey hazard" });
  for (const label of [
    "Acknowledged",
    "Under review",
    "Action assigned",
    "Mitigated",
    "Closed",
  ]) {
    await concern
      .getByRole("button", { name: "Update case", exact: true })
      .click();
    await page
      .getByLabel("Explanation / action taken", { exact: true })
      .fill("Synthetic audit: progressing this concern to " + label + ".");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Save", exact: true })
      .click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    if (label !== "Closed") await expect(concern).toContainText(label);
  }
  await page.getByRole("button", { name: "View all", exact: true }).click();
  await expect(concern).toContainText("Closed");
  await page.screenshot({
    path: ".local/audit-safety-closed-desktop.png",
    fullPage: true,
  });
  await worker
    .getByRole("button", { name: "Check status", exact: true })
    .click();
  await expect(worker.locator(".tracked-case")).toContainText("Closed");

  await page.goto("/app/settings");
  await expect(
    page.getByRole("heading", { name: "Business Settings", exact: true }),
  ).toBeVisible();
  await accessible(page);
  await page
    .getByLabel("Business phone (optional)", { exact: true })
    .fill("5550100");
  await page
    .getByRole("button", { name: "Save business settings", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByLabel("Business phone (optional)", { exact: true }),
  ).toHaveValue("5550100");
  await page
    .getByRole("link", { name: "Configure pay and rest policies", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Configure pay policy", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Hourly rate (₹)", { exact: true }).fill("125");
  await page
    .getByLabel("Reason for policy change", { exact: true })
    .fill("Synthetic audit verifies business policy editing and persistence.");
  const policySaved = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/policies" &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Save policy version", exact: true })
    .click();
  expect((await policySaved).status()).toBe(200);
  await page.reload();
  await expect(page.getByLabel("Hourly rate (₹)", { exact: true })).toHaveValue(
    "125",
  );
  await page.goto("/app/analytics");
  await page
    .getByRole("button", {
      name: "Mark workforce dashboard reviewed",
      exact: true,
    })
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Dashboard review recorded",
      exact: true,
    }),
  ).toBeDisabled();
  expect(errors).toEqual([]);
  await workerContext.close();
});

test("all public and demo workspace routes respond at desktop, tablet and mobile widths", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const [name, width, height] of [
    ["desktop", 1440, 900],
    ["tablet", 768, 1024],
    ["mobile", 375, 812],
  ] as const) {
    await page.setViewportSize({ width, height });
    for (const path of [
      "/",
      "/login",
      "/signup",
      "/forgot-password",
      "/reset-password",
      "/verify-email",
      "/auth/callback?error=access_denied",
      "/terms",
      "/privacy",
      "/invite",
      "/onboarding",
      "/safety",
    ]) {
      await page.goto(path);
      await expect(page.locator("h1").first()).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${name} ${path}`,
      ).toBe(true);
    }
    for (const role of ["worker", "admin"] as const) {
      await page.goto("/");
      await page
        .getByRole("button", {
          name:
            role === "worker" ? "Explore worker demo" : "Explore employer demo",
          exact: true,
        })
        .click();
      await expect(page.locator(".workspace-tag")).toContainText(
        role === "worker" ? "Worker workspace" : "Employer command center",
      );
      if (width === 375)
        await page
          .getByRole("button", { name: "Open navigation", exact: true })
          .click();
      const lastLink = page.locator(".sidebar").getByRole("link", {
        name: role === "worker" ? "Profile" : "Organization",
        exact: true,
      });
      await lastLink.scrollIntoViewIfNeeded();
      await expect(lastLink).toBeInViewport();
      await lastLink.click();
      for (const route of role === "worker"
        ? ["home", "shifts", "pay", "report", "cases", "rest", "profile"]
        : [
            "home",
            "workforce",
            "shifts",
            "payroll",
            "disputes",
            "safety",
            "rest",
            "analytics",
            "settings",
          ]) {
        await page.goto("/app/" + route);
        await expect(page).toHaveURL(new RegExp("/app/" + route + "$"));
        await expect(page.locator("#main-content h1").first()).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${name} ${role} ${route}`,
        ).toBe(true);
        await expect(page.getByRole("alert")).toHaveCount(0);
        if (route === "home")
          await page.screenshot({
            path: `.local/audit-${name}-${role}.png`,
            fullPage: true,
          });
      }
    }
  }
  expect(errors).toEqual([]);
});

test("employee lifecycle, existing-account invitation, token rotation/revocation and tenant permissions persist", async ({
  page,
  browser,
  request,
}) => {
  await register(
    page,
    request,
    "owner-operations@example.test",
    "Operations Owner",
  );
  await business(page, "Synthetic Operations", "owner-operations@example.test");
  const ownerToken = await bearer(page),
    ownerHeaders = { Authorization: "Bearer " + ownerToken };
  const ownerWorkspace = await (
      await request.get("/api/workspace", { headers: ownerHeaders })
    ).json(),
    org = ownerWorkspace.organizations[0].id;
  const staffContext = await browser.newContext({
      baseURL: new URL(page.url()).origin,
    }),
    staff = await staffContext.newPage();
  await register(
    staff,
    request,
    "existing-employee@example.test",
    "Existing Employee",
  );
  await expect(
    staff.getByRole("heading", { name: "Welcome to NYAVERIS AI", exact: true }),
  ).toBeVisible();
  const staffToken = await bearer(staff),
    staffHeaders = { Authorization: "Bearer " + staffToken };
  await page.goto("/app/settings");
  await page.getByLabel("Pay basis", { exact: true }).selectOption("daily");
  await page.getByLabel("Daily rate (₹)", { exact: true }).fill("1600");
  await page
    .getByLabel("Reason for policy change", { exact: true })
    .fill("Synthetic audit of inherited daily employee pay defaults.");
  const policyResponse = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/policies" &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Save policy version", exact: true })
    .click();
  expect((await policyResponse).status()).toBe(200);
  await page.goto("/app/employees");
  await page.getByRole("button", { name: "Add Employee", exact: true }).click();
  await expect(page.getByLabel("Pay basis", { exact: true })).toHaveValue(
    "daily",
  );
  await expect(
    page.getByLabel("Pay rate (integer paise)", { exact: true }),
  ).toHaveValue("160000");
  for (const [label, value] of [
    ["Employee name", "Existing Employee"],
    ["Employee email", "existing-employee@example.test"],
    ["Employee ID", "OPS001"],
    ["Department", "Operations"],
    ["Job title", "Technician"],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page
    .getByRole("button", { name: "Save and invite", exact: true })
    .click();
  const first = await page
    .getByLabel("Private invitation link", { exact: true })
    .inputValue();
  page.once("dialog", (d) => void d.accept());
  await page
    .getByRole("button", { name: "Resend / new private link", exact: true })
    .click();
  await expect(
    page.getByLabel("Private invitation link", { exact: true }),
  ).not.toHaveValue(first);
  const second = await page
    .getByLabel("Private invitation link", { exact: true })
    .inputValue();
  const token = (link: string) =>
    new URLSearchParams(new URL(link).hash.slice(1)).get("token");
  expect(
    (
      await request.post("/api/invitations/accept", {
        headers: staffHeaders,
        data: { token: token(first) },
      })
    ).status(),
  ).toBe(403);
  page.once("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "Revoke", exact: true }).click();
  await expect(
    page.getByText(/existing-employee@example.test · revoked/),
  ).toBeVisible();
  expect(
    (
      await request.post("/api/invitations/accept", {
        headers: staffHeaders,
        data: { token: token(second) },
      })
    ).status(),
  ).toBe(403);
  await page
    .locator(".saas-person")
    .filter({ hasText: "OPS001" })
    .getByRole("button", { name: "Invite", exact: true })
    .click();
  await expect(
    page.getByLabel("Private invitation link", { exact: true }),
  ).not.toHaveValue(second);
  const third = await page
    .getByLabel("Private invitation link", { exact: true })
    .inputValue();
  await page
    .getByRole("button", { name: "Hide private link", exact: true })
    .click();
  await staff.goto(third);
  await staff
    .getByRole("button", { name: "Accept Invitation", exact: true })
    .click();
  await expect(
    staff.getByRole("heading", { name: /Good to see you/ }),
  ).toBeVisible();
  expect(
    (
      await request.post("/api/invitations/accept", {
        headers: staffHeaders,
        data: { token: token(third) },
      })
    ).status(),
  ).toBe(403);
  await page.reload();
  await page.getByRole("searchbox").fill("OPS001");
  await expect(
    page.locator(".saas-person").filter({ hasText: "OPS001" }),
  ).toBeVisible();
  await page
    .getByLabel("Employment status", { exact: true })
    .selectOption("inactive");
  await expect(
    page.locator(".saas-person").filter({ hasText: "OPS001" }),
  ).toHaveCount(0);
  await page
    .getByLabel("Employment status", { exact: true })
    .selectOption("active");
  await page
    .locator(".saas-person")
    .filter({ hasText: "OPS001" })
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await page
    .getByLabel("Department", { exact: true })
    .fill("Updated Department");
  await page.getByLabel("Job title", { exact: true }).fill("Senior Technician");
  await page
    .getByLabel("Pay rate (integer paise)", { exact: true })
    .fill("15000");
  const savedEmployeeResponse = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/employees" &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Save employee", exact: true })
    .click();
  expect((await savedEmployeeResponse).status()).toBe(200);
  await page.reload();
  let records = await (
    await request.get("/api/employees?org=" + org, { headers: ownerHeaders })
  ).json();
  expect(records.employee_profiles[0]).toMatchObject({
    department: "Updated Department",
    job_title: "Senior Technician",
    rate_paise: 15000,
  });
  await page
    .locator(".saas-person")
    .filter({ hasText: "OPS001" })
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await page
    .getByLabel("Access status", { exact: true })
    .selectOption("inactive");
  page.once("dialog", (d) => void d.accept());
  await page
    .getByRole("button", { name: "Save employee", exact: true })
    .click();
  await expect(
    page.locator(".saas-person").filter({ hasText: "OPS001" }),
  ).toContainText("inactive");
  expect(
    (
      await request.get("/api/workspace?org=" + org, { headers: staffHeaders })
    ).status(),
  ).toBe(403);
  await page
    .locator(".saas-person")
    .filter({ hasText: "OPS001" })
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await page
    .getByLabel("Access status", { exact: true })
    .selectOption("active");
  page.once("dialog", (d) => void d.accept());
  await page
    .getByRole("button", { name: "Save employee", exact: true })
    .click();
  await staff.goto("/app/home");
  await expect(
    staff.getByRole("heading", { name: /Good to see you/ }),
  ).toBeVisible();
  expect(
    (
      await request.post("/api/administrator-access", {
        headers: staffHeaders,
        data: {
          organization_id: org,
          user_id: records.employee_profiles[0].user_id,
          admin: true,
        },
      })
    ).status(),
  ).toBe(403);
  const otherContext = await browser.newContext({
      baseURL: new URL(page.url()).origin,
    }),
    other = await otherContext.newPage();
  await register(
    other,
    request,
    "other-owner-audit@example.test",
    "Other Owner",
  );
  await business(
    other,
    "Unrelated Synthetic Business",
    "other-owner-audit@example.test",
    "manufacturing",
  );
  await other.goto("/app/profile");
  await expect(
    other
      .locator(".profile-details dd")
      .filter({ hasText: /^General workplace$/ }),
  ).toHaveCount(1);
  const otherHeaders = { Authorization: "Bearer " + (await bearer(other)) };
  expect(
    (
      await request.get("/api/workspace?org=" + org, { headers: otherHeaders })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.get("/api/employees?org=" + org, { headers: otherHeaders })
    ).status(),
  ).toBe(403);
  await page.goto("/app/settings");
  page.once("dialog", (d) => void d.accept());
  await page
    .getByRole("button", { name: "Grant admin access", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Remove admin access", exact: true }),
  ).toBeVisible();
  const settings = records.business_settings[0];
  const b = {
    organization_id: org,
    name: "Forbidden change",
    email: settings.email,
    phone: settings.phone,
    industry: settings.industry,
    location: settings.location,
    country: settings.country,
    state: settings.state,
    city: settings.city,
    description: settings.description,
    size: settings.size,
    working_days: settings.working_days,
    currency: "INR",
    departments: [],
    work_locations: [],
  };
  expect(
    (
      await request.post("/api/business-settings", {
        headers: staffHeaders,
        data: b,
      })
    ).status(),
  ).toBe(403);
  page.once("dialog", (d) => void d.accept());
  await page
    .getByRole("button", { name: "Remove admin access", exact: true })
    .click();

  await page.goto("/app/shifts");
  await page.getByRole("button", { name: "Create shift", exact: true }).click();
  await page
    .getByLabel("Shift start", { exact: true })
    .fill("2026-11-08T09:00");
  await page.getByLabel("Shift end", { exact: true }).fill("2026-11-08T17:30");
  await page
    .getByLabel("Site / department", { exact: true })
    .fill("Synthetic cancellation test");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const pendingShift = page
    .getByRole("row")
    .filter({ hasText: "Synthetic cancellation test" });
  await pendingShift
    .getByRole("button", { name: "Schedule what-if", exact: true })
    .click();
  await page
    .getByLabel("Site / department", { exact: true })
    .fill("Synthetic edited cancellation test");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "Synthetic edited cancellation test" }),
  ).toBeVisible();
  page.once("dialog", (d) => void d.accept());
  await page
    .getByRole("row")
    .filter({ hasText: "Synthetic edited cancellation test" })
    .getByRole("button", { name: "Cancel shift", exact: true })
    .click();
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "Synthetic edited cancellation test" }),
  ).toHaveCount(0);
  await staff.goto("/invite#token=" + "0".repeat(64));
  await expect(staff.getByRole("alert")).toBeVisible();
  await expect(
    staff.getByText("Checking invitation for your verified account…", {
      exact: true,
    }),
  ).not.toBeVisible();
  await otherContext.close();
  await staffContext.close();
});

test("protected-route bootstrap, configuration failure and rejected sessions recover visibly", async ({
  page,
}) => {
  await page.goto("/app/settings");
  await expect(page).toHaveURL(/\/login$/);
  await page.route("**/api/config", (r) =>
    r.fulfill({ status: 503, json: { error: "Configuration unavailable" } }),
  );
  await page.goto("/app/settings");
  await expect(
    page.getByRole("heading", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reload authentication", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeDisabled();
  await page.unroute("**/api/config");
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore worker demo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Good to see you/ }),
  ).toBeVisible();
  await page.route("**/api/workspace**", (r) =>
    r.fulfill({
      status: 401,
      json: { error: "Session expired. Sign in again." },
    }),
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Sign in", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        Object.entries(localStorage).filter(([k]) => k.endsWith("-auth-token"))
          .length,
    ),
  ).toBe(0);
});

test("case filters, assistant topics, speech handler and keyboard menus respond", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore worker demo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Good to see you/ }),
  ).toBeVisible();
  await page.goto("/app/cases");
  for (const label of [
    "View all",
    "Awaiting review",
    "Awaiting your confirmation",
    "Closed",
  ]) {
    const button = page
      .locator(".filter-row")
      .getByRole("button", { name: label, exact: true });
    await button.click();
    await expect(button).toHaveClass(/active/);
  }
  await page.locator(".assistant-fab").click();
  await expect(page.locator(".assistant-response")).toBeVisible();
  for (const label of ["My pay", "Report concern", "RestGuard", "My cases"]) {
    await page
      .locator(".assistant-topics")
      .getByRole("button", { name: label, exact: true })
      .click();
    await expect(page.locator(".assistant-response")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText(
      "Reliable text guidance",
    );
  }
  const voice = page.getByRole("button", { name: "Read aloud", exact: true });
  if (await voice.count()) {
    await voice.click();
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await expect(page.locator(".sidebar")).toHaveClass(/mobile-open/);
  await page
    .getByRole("button", { name: "Close navigation", exact: true })
    .click();
  await expect(page.locator(".sidebar")).not.toHaveClass(/mobile-open/);
  expect(errors).toEqual([]);
});
