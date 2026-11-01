import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// These flows change shared in-memory state (check-in, weekly feedback), so run them in order.
test.describe.configure({ mode: "serial" });

async function expectNoA11yViolations(page: Page) {
  await expect(page).toHaveTitle(/FairShift/);
  await page.waitForTimeout(400);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
}

async function loginAs(page: Page, name: RegExp) {
  await page.goto("/login");
  await page.getByRole("button", { name }).first().click();
  await page.waitForURL(/\/(w|a)(\?welcome=1)?$/);
}

test("worker checks in with the site QR, then checks out — the heading always matches", async ({ page }) => {
  await loginAs(page, /Ramesh/);
  await page.goto("/w/checkin");
  await expectNoA11yViolations(page);
  await page.getByRole("button", { name: "Demo: scan site QR" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Checked in!" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Check out" })).toHaveCount(0);

  await page.goto("/w");
  await expect(page.getByText(/Checked in at/)).toBeVisible();

  await page.goto("/w/checkin");
  await page.getByRole("button", { name: "Check out now" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Checked out!" })).toBeVisible();
});

test("FairPay Sentinel shows the possible shortfall with its arithmetic, and a review can be requested", async ({
  page,
}) => {
  await loginAs(page, /Ramesh/);
  await page.goto("/w/pay");
  await expect(page.getByTestId("net-pay")).toContainText("₹");
  await expect(page.getByTestId("overtime-line")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Possible shortfall: ₹907" })).toBeVisible();
  await expect(page.getByText("13h 32m overtime recorded, 9h paid → 4h 32m × ₹200/h = ₹907")).toBeVisible();
  await expectNoA11yViolations(page);
  await page.getByRole("button", { name: "Request review" }).click();
  await expect(page.getByText("Your review request")).toBeVisible();
  await page.getByRole("button", { name: "Why this amount?" }).click();
  await expect(page.getByText(/You receive ₹/).first()).toBeVisible();
});

test("Back walks real pages only: Home → Pay (months ×2) → Report → Me, then back to Home", async ({ page }) => {
  await loginAs(page, /Ramesh/);
  const nav = page.getByRole("navigation", { name: "Main menu" }).first();
  await nav.getByRole("link", { name: "Pay", exact: true }).click();
  await expect(page).toHaveURL(/\/w\/pay$/);
  const months = page.getByRole("navigation", { name: "Period" }).getByRole("link");
  await months.nth(1).click();
  await expect(page).toHaveURL(/m=/);
  await months.nth(2).click();
  await nav.getByRole("link", { name: "Report", exact: true }).click();
  await expect(page).toHaveURL(/\/w\/report$/);
  await nav.getByRole("link", { name: "Me", exact: true }).click();
  await expect(page).toHaveURL(/\/w\/skills$/);

  // Browser back, then the app's own Back button: both skip the month tabs.
  await page.goBack();
  await expect(page).toHaveURL(/\/w\/report$/);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(/\/w\/pay(\?m=.*)?$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/w$/);
  await expect(page.getByRole("button", { name: "Back", exact: true })).toHaveCount(0);
});

test("worker reports a hazard by icon and tracks it anonymously with a private number", async ({ page }) => {
  await loginAs(page, /Ramesh/);
  await page.goto("/w/report");
  await expectNoA11yViolations(page);
  await page.getByRole("button", { name: "Electrical" }).click();
  await expect(page.getByRole("heading", { name: "Is this right?" })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Hide my name" })).toBeChecked();
  await page.getByLabel(/Where is it/).fill("Lift lobby");
  await page.getByRole("button", { name: "Send report" }).click();

  await expect(page).toHaveURL(/\/w\/report\/haz-/);
  await expect(page.getByText("Report sent!")).toBeVisible();
  await expect(page.getByText("Your name is hidden from your manager.")).toBeVisible();
  await expect(page.getByText(/^FS-[A-Z0-9]{6}$/)).toBeVisible();
  await expectNoA11yViolations(page);

  await page.goto("/w/report");
  await expect(page.getByRole("link", { name: /Electrical/ }).first()).toBeVisible();
});

test("a second report of the same danger joins the first after the worker confirms", async ({ page }) => {
  await loginAs(page, /Ramesh/);
  await page.goto("/w/report");
  await page.getByRole("button", { name: "Scaffolding" }).click();
  await page.getByLabel(/Where is it/).fill("Floor 3");
  await page.getByRole("button", { name: "Send report" }).click();
  await expect(page.getByRole("heading", { name: "Someone already reported this" })).toBeVisible();
  await page.getByRole("button", { name: "Yes, add my report" }).click();
  await expect(page).toHaveURL(/\/w\/report\/haz-c2\?new=merged/);
  await expect(page.getByText(/3 workers reported this/)).toBeVisible();
});

test("the reporter answers 'Is it really fixed?'", async ({ page }) => {
  await loginAs(page, /Ramesh/);
  await page.goto("/w/report/haz-c3");
  await expect(page.getByRole("heading", { name: "Is it really fixed?" })).toBeVisible();
  await page.getByRole("button", { name: "No, still a problem" }).click();
  await expect(page.getByText("Reopened").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Is it really fixed?" })).toHaveCount(0);
});

test("voice endpoint understands a typed report and rejects outsiders", async ({ page, request }) => {
  const anonymous = await request.post("/api/voice/hazard", { multipart: { text: "wire sparking" } });
  expect(anonymous.status()).toBe(401);

  await loginAs(page, /Ramesh/);
  // What the phone sends after recognising speech in each language: words are kept exactly as spoken.
  const spoken: [string, string][] = [
    ["en", "There is an exposed electric wire near the tank"],
    ["hi", "बिजली का तार खुला है"],
    ["ta", "தண்ணீர் தொட்டி அருகே மின் கம்பி வெளியே தெரிகிறது"],
    ["te", "ట్యాంక్ దగ్గర కరెంట్ వైర్ బయట ఉంది"],
  ];
  for (const [locale, text] of spoken) {
    const response = await page.request.post("/api/voice/hazard", { multipart: { text, locale } });
    expect(response.ok()).toBe(true);
    expect(await response.json(), locale).toMatchObject({ understood: true, category: "electrical", transcript: text });
  }
});

test("feedback faces are a keyboard radiogroup, and feedback is accepted once per week", async ({ page }) => {
  await loginAs(page, /Sunita/);
  await page.goto("/w/feedback");
  await expectNoA11yViolations(page);
  const first = page.getByRole("radiogroup", { name: "Is your pay fair?" });
  await first.getByRole("radio", { name: "Bad" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(first.getByRole("radio", { name: "Okay" })).toHaveAttribute("aria-checked", "true");
  for (const question of ["Do you feel safe?", "Is your manager respectful?"]) {
    await page.getByRole("radiogroup", { name: question }).getByRole("radio", { name: "Okay" }).click();
  }
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Thank you for your feedback!")).toBeVisible();

  await page.goto("/w/feedback");
  await expect(page.getByText("You already answered this week ✓")).toBeVisible();
});

test("'Me too' on a 4-signature issue escalates it to management", async ({ page }) => {
  await loginAs(page, /Sunita/);
  await page.goto("/w/feedback");
  await page.getByRole("tab", { name: /Issues at your site/ }).click();
  await expect(page.getByText("4 of 5 needed")).toBeVisible();
  await expectNoA11yViolations(page);
  const card = page.getByRole("listitem").filter({ hasText: "Small-size gloves" });
  await card.getByRole("button", { name: "Me too" }).click();
  await expect(page.getByText(/management can see it now/)).toBeVisible();
});

test("skill passport: choose what to share, show a 30-day QR, open it", async ({ page }) => {
  await loginAs(page, /Ramesh/);
  await page.goto("/w/skills");
  await expect(page.getByRole("heading", { name: "Benefits you can claim" })).toBeVisible();
  await expect(page.getByRole("img", { name: "72 of 90 days" })).toBeVisible();
  await expect(page.getByText("Verified by employer").first()).toBeVisible();
  await expectNoA11yViolations(page);
  await page.getByRole("switch", { name: "Hours worked" }).uncheck();
  await page.getByRole("button", { name: "Show my QR code" }).click();
  await expect(page.getByRole("img", { name: "Skill passport QR code" })).toBeVisible();
  const href = await page.getByRole("link", { name: "Open the link" }).getAttribute("href");
  await page.goto(href!);
  await expect(page.getByText(/Valid until/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Work history" })).toBeVisible();
  await expect(page.getByText("Hours worked")).toHaveCount(0);
  await expectNoA11yViolations(page);
});

test("admin kiosk shows a rotating QR for its own site only", async ({ page }) => {
  await loginAs(page, /Priya/);
  await page.goto("/a/kiosk");
  await page.getByRole("link", { name: /Velachery/ }).click();
  await expect(page.getByTestId("kiosk-qr").locator("svg")).toBeVisible();
  await expectNoA11yViolations(page);

  // Another org's site renders the not-found page and never a QR code.
  await page.goto("/a/kiosk/site2");
  await expect(page.getByRole("heading", { name: "We could not find this page" })).toBeVisible();
  await expect(page.getByTestId("kiosk-qr")).toHaveCount(0);
});

test("sync endpoint rejects bad input and unauthenticated calls", async ({ page, request }) => {
  expect((await request.post("/api/sync", { data: { ops: [] } })).status()).toBe(401);
  await loginAs(page, /Ramesh/);
  expect((await page.request.post("/api/sync", { data: { ops: [] } })).status()).toBe(400);
  expect(
    (
      await page.request.post("/api/sync", {
        data: "x".repeat(20_000),
        headers: { "content-type": "application/json" },
      })
    ).status(),
  ).toBe(413);
});

test("help page: one-tap 112, and a typed problem gets steps and the right helplines", async ({ page }) => {
  await loginAs(page, /Ramesh/);
  await page.getByRole("link", { name: "Help" }).first().click();
  await expect(page.getByRole("link", { name: /Emergency\? Call 112/ })).toHaveAttribute("href", "tel:112");
  await expectNoA11yViolations(page);
  await page.getByLabel("What happened?").fill("There is smoke coming from the store room");
  await page.getByRole("button", { name: "Get help" }).click();
  const answer = page.locator("[aria-live=polite]").filter({ hasText: "Report the danger" });
  await expect(answer.getByText("Emergency", { exact: true }).first()).toBeVisible();
  await expect(answer.getByRole("link", { name: /Emergency\s*112/ })).toHaveAttribute("href", "tel:112");
});
