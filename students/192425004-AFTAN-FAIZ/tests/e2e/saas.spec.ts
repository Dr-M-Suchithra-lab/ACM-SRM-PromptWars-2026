import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const uid = "70000000-0000-4000-8000-000000000001",
  oid = "71000000-0000-4000-8000-000000000001";
const policy = {
  basis: "hourly",
  hourly_paise: 10000,
  daily_paise: 80000,
  regular_minutes: 480,
  overtime_bps: 15000,
  min_rest_minutes: 660,
  max_shift_minutes: 720,
  max_consecutive_days: 6,
  timezone: "Asia/Kolkata",
};
test("signup validates passwords and requests email verification without a hosted signup", async ({
  page,
}) => {
  let signup = false;
  await page.route("**/auth/v1/signup**", async (r) => {
    signup = true;
    await r.fulfill({
      json: {
        id: uid,
        email: "synthetic@example.test",
        aud: "authenticated",
        role: "authenticated",
        identities: [],
        created_at: new Date().toISOString(),
        user_metadata: {},
      },
    });
  });
  await page.goto("/signup");
  await page.getByLabel("Full name", { exact: true }).fill("Synthetic Owner");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("synthetic@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("synthetic passphrase");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("different passphrase");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Passwords must match");
  expect(signup).toBe(false);
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("synthetic passphrase");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Check your email" }),
  ).toBeVisible();
  expect(signup).toBe(true);
});
test("password controls, recovery, configuration guidance and mobile layout", async ({
  page,
}) => {
  await page.route("**/auth/v1/recover**", (r) => r.fulfill({ json: {} }));
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/login");
  await page
    .getByLabel("Password", { exact: true })
    .fill("synthetic passphrase");
  await page
    .getByRole("button", { name: "Show password", exact: true })
    .click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page
    .getByRole("button", { name: "Hide password", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeDisabled();
  await expect(
    page.getByText("Google sign-in is awaiting provider configuration.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Forgot password?" }).click();
  // Wait for the new route before filling: both forms have an email control.
  await expect(
    page.getByRole("heading", { name: "Forgot your password?", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Email address", { exact: true })
    .fill("synthetic@example.test");
  await page.getByRole("button", { name: "Send reset instructions" }).click();
  await expect(page.getByRole("status")).toContainText(
    "If this address is eligible",
  );
  await page.goto(
    "/auth/callback?error=access_denied&next=https://evil.example",
  );
  await expect(page.getByRole("alert")).toContainText("cancelled");
  expect(new URL(page.url()).origin).not.toBe("https://evil.example");
});
test("new owner onboarding preserves wizard input and routes to an empty authorized business (Auth/API adapters)", async ({
  page,
}) => {
  let created = false;
  let submitted: Record<string, unknown> | null = null;
  const member = {
    organization_id: oid,
    user_id: uid,
    role: "admin",
    display_name: "Synthetic Owner",
    active: true,
  };
  await page.route("**/api/config", async (r) => {
    const response = await r.fetch();
    await r.fulfill({
      json: { ...(await response.json()), saasEnabled: true },
    });
  });
  await page.route("**/auth/v1/token**", (r) => {
    const payload = Buffer.from(
      JSON.stringify({ sub: uid, exp: Math.floor(Date.now() / 1000) + 3600 }),
    ).toString("base64url");
    return r.fulfill({
      json: {
        access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.synthetic`,
        refresh_token: "synthetic-refresh",
        token_type: "bearer",
        expires_in: 3600,
        user: {
          id: uid,
          email: "synthetic@example.test",
          email_confirmed_at: new Date().toISOString(),
          aud: "authenticated",
          role: "authenticated",
          user_metadata: {},
        },
      },
    });
  });
  await page.route("**/api/account", (r) =>
    r.fulfill({
      json: {
        memberships: created ? [member] : [],
        verified: true,
        saasEnabled: true,
      },
    }),
  );
  await page.route("**/api/businesses", async (r) => {
    submitted = r.request().postDataJSON();
    created = true;
    await r.fulfill({ json: { organization_id: oid } });
  });
  await page.route("**/api/workspace**", (r) =>
    r.fulfill({
      json: {
        userId: uid,
        member,
        memberships: [member],
        organizations: [
          {
            id: oid,
            name: "Synthetic Business",
            sector_id: "construction",
            is_demo: false,
          },
        ],
        pay_policies: [policy],
        organization_members: [member],
        employee_profiles: [],
        shifts: [],
        payroll_entries: [],
        pay_disputes: [],
        dispute_events: [],
        safety_reports: [],
        safety_case_events: [],
        pay: [],
        risks: [],
      },
    }),
  );
  await page.goto("/login");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("synthetic@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("synthetic passphrase");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome to NYAVERIS AI" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Create My Business" }).click();
  for (const [label, value] of [
    ["Business name", "Synthetic Business"],
    ["Business email", "synthetic@example.test"],
    ["Business location", "Test site"],
    ["State", "Test state"],
    ["City", "Test city"],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("group", { name: "Workforce configuration" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel("Business name", { exact: true })).toHaveValue(
    "Synthetic Business",
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Create Business", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your workforce, in focus." }),
  ).toBeVisible();
  expect(submitted).toMatchObject({ name: "Synthetic Business" });
  await expect(page.locator(".demo-strip")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Employees", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "My shifts", exact: true })
    .count()
    .then(async (count) => {
      if (count)
        await page
          .getByRole("link", { name: "My shifts", exact: true })
          .click();
      else
        await page.getByRole("link", { name: "Shifts", exact: true }).click();
    });
  await expect(
    page.getByRole("heading", { name: "Shift calendar", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next month", exact: true }).click();
  await page.locator(".calendar-days button").first().click();
  await expect(
    page.getByLabel("Filter shifts by date, employee or location", {
      exact: true,
    }),
  ).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);
  let savedEmployee: Record<string, unknown> | null = null;
  await page.route("**/api/employees**", async (r) => {
    if (r.request().method() === "POST") {
      savedEmployee = {
        ...r.request().postDataJSON(),
        id: "72000000-0000-4000-8000-000000000001",
        user_id: null,
      };
      await r.fulfill({
        json: { employee_id: "72000000-0000-4000-8000-000000000001" },
      });
      return;
    }
    await r.fulfill({
      json: {
        employee_profiles: savedEmployee ? [savedEmployee] : [],
        organization_invitations: [],
        business_settings: [{ organization_id: oid, owner_user_id: uid }],
        business_events: [],
      },
    });
  });
  await page.route("**/api/invitations", (r) =>
    r.fulfill({
      json: {
        link: "http://127.0.0.1:8188/invite#token=" + "a".repeat(64),
        delivery: "not_configured",
        message:
          "Invitation saved. Email delivery is not configured; share the link securely.",
      },
    }),
  );
  await page.getByRole("link", { name: "Employees", exact: true }).click();
  await page
    .getByRole("button", { name: "Invite Employee", exact: true })
    .click();
  await page
    .getByLabel("Employee name", { exact: true })
    .fill("Synthetic Worker");
  await page
    .getByLabel("Employee email", { exact: true })
    .fill("worker@example.test");
  await page.getByLabel("Employee ID", { exact: true }).fill("SYN001");
  await page
    .getByRole("button", { name: "Save and invite", exact: true })
    .click();
  await expect(page.locator(".saas-workforce [role=status]")).toContainText(
    "Email delivery is not configured",
  );
  await expect(
    page.getByRole("button", { name: "Copy Invitation Link", exact: true }),
  ).toBeVisible();
  const clipboardErrors: string[] = [];
  page.on("pageerror", (e) => clipboardErrors.push(e.message));
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      get: () => undefined,
      configurable: true,
    }),
  );
  await page
    .getByRole("button", { name: "Copy Invitation Link", exact: true })
    .click();
  await expect(page.locator(".saas-workforce [role=status]")).toContainText(
    "Clipboard unavailable",
  );
  expect(clipboardErrors).toEqual([]);
  expect(savedEmployee).not.toHaveProperty("password");
  expect(savedEmployee).toMatchObject({
    email: "worker@example.test",
    pay_basis: "hourly",
  });
  let workforceFailed = true;
  await page.route("**/api/employees**", (r) =>
    workforceFailed
      ? r.fulfill({
          status: 503,
          json: { error: "Workforce records unavailable" },
        })
      : r.fulfill({
          json: {
            employee_profiles: savedEmployee ? [savedEmployee] : [],
            organization_invitations: [],
            business_settings: [],
            business_events: [],
          },
        }),
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Retry workforce records", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Loading authorized records…", { exact: true }),
  ).not.toBeVisible();
  workforceFailed = false;
  await page
    .getByRole("button", { name: "Retry workforce records", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Workforce directory", exact: true }),
  ).toBeVisible();
});

test("account pages have accessible landmarks and mobile layouts", async ({
  page,
}) => {
  for (const path of [
    "/login",
    "/signup",
    "/forgot-password",
    "/verify-email",
    "/reset-password",
  ]) {
    await page.goto(path);
    await expect(page.locator(".auth-card h1")).toBeVisible();
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      scan.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ).toEqual([]);
  }
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/signup");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".local/saas-signup-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/login");
  await page.screenshot({
    path: ".local/saas-login-desktop.png",
    fullPage: true,
  });
});
test("invitation entry never grants arbitrary company access", async ({
  page,
}) => {
  await page.goto("/invite");
  await expect(
    page.getByText("A company name or employee ID cannot grant access.", {
      exact: false,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Invitation link", { exact: true })
    .fill("https://evil.example/invite#token=" + "a".repeat(64));
  await page.getByRole("button", { name: "Open invitation" }).click();
  await expect(page.getByRole("alert")).toContainText("valid invitation link");
});

test("PKCE recovery callback consumes its code and updates the password (isolated Auth adapter)", async ({
  page,
}) => {
  let exchanged = false,
    updated = false;
  const user = {
    id: uid,
    email: "synthetic@example.test",
    email_confirmed_at: new Date().toISOString(),
    aud: "authenticated",
    role: "authenticated",
    user_metadata: {},
  };
  await page.route("**/auth/v1/recover**", (r) => r.fulfill({ json: {} }));
  await page.route("**/auth/v1/token**", (r) => {
    const body = r.request().postDataJSON();
    exchanged =
      body.auth_code === "synthetic-code" &&
      typeof body.code_verifier === "string" &&
      body.code_verifier.length > 20;
    const payload = Buffer.from(
      JSON.stringify({ sub: uid, exp: Math.floor(Date.now() / 1000) + 3600 }),
    ).toString("base64url");
    return r.fulfill({
      json: {
        access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.synthetic`,
        refresh_token: "synthetic-refresh",
        token_type: "bearer",
        expires_in: 3600,
        user,
      },
    });
  });
  await page.route("**/auth/v1/user**", (r) => {
    if (r.request().method() === "PUT") updated = true;
    return r.fulfill({ json: user });
  });
  await page.route("**/auth/v1/logout**", (r) => r.fulfill({ json: {} }));
  await page.route("**/api/account", (r) =>
    r.fulfill({
      json: { memberships: [], pendingInvitations: [], verified: true },
    }),
  );
  await page.goto("/forgot-password");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("synthetic@example.test");
  await page.getByRole("button", { name: "Send reset instructions" }).click();
  await expect(page.getByRole("status")).toContainText(
    "If this address is eligible",
  );
  await page.goto("/auth/callback?code=synthetic-code&next=%2Freset-password");
  await expect(
    page.getByRole("heading", { name: "Set a new password" }),
  ).toBeVisible();
  expect(exchanged).toBe(true);
  expect(page.url()).not.toContain("code=");
  await page
    .getByLabel("Password", { exact: true })
    .fill("new synthetic passphrase");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("new synthetic passphrase");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(
    page.getByRole("heading", { name: "Sign in", exact: true }),
  ).toBeVisible();
  expect(updated).toBe(true);
});

for (const route of ["/login", "/signup"])
  test(`configured Google button on ${route} starts the supported provider flow with a local callback (provider not contacted)`, async ({
    page,
  }) => {
    let authorizedUrl = "";
    await page.route("**/api/config", async (r) => {
      const response = await r.fetch();
      await r.fulfill({
        json: { ...(await response.json()), googleEnabled: true },
      });
    });
    await page.route("**/auth/v1/authorize**", async (r) => {
      authorizedUrl = r.request().url();
      await r.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<p>Isolated OAuth handoff</p>",
      });
    });
    await page.goto(route);
    const origin = new URL(page.url()).origin;
    await page.getByRole("button", { name: "Continue with Google" }).click();
    await expect(page.getByText("Isolated OAuth handoff")).toBeVisible();
    const target = new URL(authorizedUrl);
    expect(target.searchParams.get("provider")).toBe("google");
    expect(new URL(target.searchParams.get("redirect_to")!).origin).toBe(
      origin,
    );
    expect(target.searchParams.get("code_challenge")).toBeTruthy();
  });
