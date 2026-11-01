// Uses only the existing isolated synthetic project. Never logs credentials or
// records traces/screenshots. Writes are opt-in and affect newly created QA rows.
// SUBMISSION_ENV_FILE supplies existing credentials in memory only.
// BACKEND_VERIFY_URL selects an existing deployment; omitted => local built server.
// VERIFY_SYNTHETIC_WRITES=true enables one pay review, two safety cases and 3 shifts.
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { parse } from "dotenv";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
process.chdir(root);
const temp = resolve(".local/tmp");
mkdirSync(temp, { recursive: true });
const file = process.env.SUBMISSION_ENV_FILE || ".env";
const env = {
  ...process.env,
  ...(existsSync(file) ? parse(readFileSync(file)) : {}),
};
const origin = process.env.BACKEND_VERIFY_URL || "http://127.0.0.1:8188";
const mutate = process.env.VERIFY_SYNTHETIC_WRITES === "true";
const expectedProject = "https://vkkjuopfidvfhzsqzius.supabase.co";
const build = "10000000-0000-4000-8000-000000000001";
const hospital = "10000000-0000-4000-8000-000000000002";
const worker = "20000000-0000-4000-8000-000000000001";
const hospitalWorker = "20000000-0000-4000-8000-000000000003";
const checks = [];
const fixtures = [];
const marker = `Synthetic backend QA ${Date.now()}`;
let browser,
  server,
  stage = "configuration",
  failed = false;
const check = (name, ok) => {
  stage = name;
  if (!ok) throw new Error("Verification failed");
  checks.push(name);
};
async function api(path, body, token) {
  const r = await fetch(origin + "/api" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(20000),
  });
  return { status: r.status, data: await r.json() };
}
async function success(name, path, body, token) {
  stage = name;
  const r = await api(path, body, token);
  check(name, r.status >= 200 && r.status < 300);
  return r.data;
}
try {
  check(
    "Verification targets only the authorized application",
    ["http://127.0.0.1:8188", "https://nyaveris-ai.vercel.app"].includes(
      origin,
    ),
  );
  check(
    "Expected existing Supabase project configured",
    env.SUPABASE_URL === expectedProject,
  );
  if (!process.env.BACKEND_VERIFY_URL) {
    server = spawn(process.execPath, ["dist-server/index.js"], {
      cwd: root,
      env: {
        ...env,
        NODE_ENV: "production",
        PORT: "8188",
        TEMP: temp,
        TMP: temp,
      },
      windowsHide: true,
      stdio: "ignore",
    });
    let ready = false;
    for (let i = 0; i < 40; i++) {
      try {
        ready = (await fetch(origin + "/health")).ok;
      } catch {}
      if (ready) break;
      await new Promise((r) => setTimeout(r, 250));
    }
    check("Built local server starts", ready);
  }
  await success("Health route", "/health");
  const config = await success("Public runtime configuration", "/config");
  check(
    "Frontend and backend use intended project and publishable key",
    config.url === expectedProject &&
      config.publishableKey === env.SUPABASE_PUBLISHABLE_KEY,
  );
  check("Synthetic demo explicitly enabled", config.demoEnabled === true);
  const publicOrgs = await success(
    "Synthetic organization selector",
    "/demo-organizations",
  );
  check(
    "Only two expected demo organizations listed",
    publicOrgs.length === 2 &&
      publicOrgs.every((o) => [build, hospital].includes(o.id)),
  );
  check("Missing bearer rejected", (await api("/workspace")).status === 401);
  check(
    "Invalid bearer rejected",
    (await api("/workspace", undefined, "invalid-synthetic-token")).status ===
      401,
  );
  const tokens = {};
  const workspaces = {};
  for (const sector of ["construction", "healthcare"]) {
    for (const role of ["worker", "admin"]) {
      const name = `${sector}-${role}`;
      const login = await success(`${name} demo login`, "/demo-session", {
        sector,
        role,
      });
      tokens[name] = login.access_token;
      workspaces[name] = await success(
        `${name} authorized workspace`,
        "/workspace",
        undefined,
        login.access_token,
      );
      check(
        `${name} protected membership and synthetic tenant`,
        workspaces[name].member.role === role &&
          workspaces[name].organizations.every(
            (o) =>
              o.is_demo &&
              o.id === (sector === "construction" ? build : hospital),
          ),
      );
    }
  }
  const w = tokens["construction-worker"],
    a = tokens["construction-admin"];
  const ha = tokens["healthcare-admin"];
  check(
    "Cross-tenant API access denied",
    (await api("/workspace?org=" + hospital, undefined, w)).status === 403,
  );
  const primary = workspaces["construction-worker"].pay.find(
    (p) => p.shiftId === "30000000-0000-4000-8000-000000000001",
  );
  check(
    "Existing seeded 1100 / 950 / 150 paise calculation preserved",
    primary?.expectedPaise === 110000 &&
      primary.recordedPaise === 95000 &&
      primary.discrepancyPaise === 15000,
  );
  const policy = workspaces["construction-admin"].pay_policies[0];
  const {
    organization_id: ignored,
    version: ignoredVersion,
    ...policyInput
  } = policy;
  check(
    "Worker policy mutation denied",
    (
      await api(
        "/policies",
        {
          ...policyInput,
          organization_id: build,
          note: "Synthetic unauthorized policy attempt.",
        },
        w,
      )
    ).status === 403,
  );
  check(
    "Admin malformed policy rejected without mutation",
    (await api("/policies", {}, a)).status === 400,
  );
  const baselineHospital = workspaces["healthcare-admin"].shifts;
  if (mutate) {
    const shiftBody = {
      id: null,
      organization_id: build,
      worker_id: worker,
      starts_at: "2026-10-20T08:00:00+05:30",
      ends_at: "2026-10-20T18:30:00+05:30",
      break_minutes: 30,
      location: marker,
    };
    check(
      "Worker cannot create shifts",
      (await api("/shifts", shiftBody, w)).status === 403,
    );
    const saved = await success(
      "Admin creates new QA shift",
      "/shifts",
      shiftBody,
      a,
    );
    const shift = saved.data;
    fixtures.push({ kind: "pay-shift", id: shift });
    await success(
      "Worker confirms QA hours",
      "/shifts/confirm",
      { shift_id: shift },
      w,
    );
    const payrollBody = {
      shift_id: shift,
      gross_paise: 95000,
      note: marker + " payroll.",
    };
    check(
      "Other tenant cannot record payroll",
      (await api("/payroll", payrollBody, ha)).status === 403,
    );
    await success("Admin records QA payroll", "/payroll", payrollBody, a);
    const payState = await success(
      "QA wages persist on refresh",
      "/workspace",
      undefined,
      w,
    );
    const pay = payState.pay.find((p) => p.shiftId === shift);
    check(
      "New QA wages equal 1100 / 950 / 150",
      pay?.expectedPaise === 110000 &&
        pay.recordedPaise === 95000 &&
        pay.discrepancyPaise === 15000,
    );
    const reviewBody = {
      shift_id: shift,
      reason: marker + ": review the overtime difference.",
    };
    const review = await success(
      "Worker requests QA review",
      "/reviews",
      reviewBody,
      w,
    );
    const dispute = review.data;
    check(
      "Duplicate open review rejected",
      (await api("/reviews", reviewBody, w)).status === 409,
    );
    const resolution = {
      dispute_id: dispute,
      corrected_paise: 110000,
      explanation: marker + ": verified overtime correction.",
    };
    check(
      "Worker cannot correct payroll",
      (await api("/reviews/resolve", resolution, w)).status === 403,
    );
    await success(
      "Admin responds with QA correction",
      "/reviews/resolve",
      resolution,
      a,
    );
    await success(
      "Worker reopens QA response for clarification",
      "/reviews/reopen",
      {
        dispute_id: dispute,
        reason: marker + ": please clarify the correction.",
      },
      w,
    );
    await success(
      "Admin clarifies QA correction",
      "/reviews/resolve",
      resolution,
      a,
    );
    await success(
      "Worker confirms QA resolution",
      "/reviews/confirm",
      { dispute_id: dispute },
      w,
    );
    const closed = await success(
      "Closed case and ProofLoop persist",
      "/workspace",
      undefined,
      w,
    );
    check(
      "QA case closes with corrected pay",
      closed.pay_disputes.find((d) => d.id === dispute)?.status === "closed" &&
        closed.pay.find((p) => p.shiftId === shift)?.discrepancyPaise === 0,
    );
    const events = closed.dispute_events.filter((e) => e.shift_id === shift);
    const types = events.map((e) => e.event_type);
    check(
      "Complete atomic ProofLoop history present",
      [
        "schedule_saved",
        "hours_confirmed",
        "payroll_recorded",
        "fairness_check",
        "review_requested",
        "employer_response",
        "worker_requested_clarification",
        "worker_confirmed_resolution",
      ].every((t) => types.includes(t)),
    );
    check(
      "ProofLoop correction retains previous and corrected paise",
      events.some(
        (e) =>
          e.event_type === "employer_response" &&
          e.details.previous_paise === 95000 &&
          e.details.corrected_paise === 110000,
      ),
    );
    const caller = createClient(config.url, config.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${a}` } },
    });
    check(
      "Application admin cannot overwrite QA ProofLoop events",
      !!(
        await caller
          .from("dispute_events")
          .update({ explanation: "Synthetic unauthorized event edit." })
          .eq("shift_id", shift)
      ).error,
    );
    check(
      "Anonymous report rejects employee identifiers",
      (
        await api("/safety", {
          organization_id: build,
          category: "equipment",
          priority: "normal",
          description: marker + ": synthetic guardrail inspection.",
          employee_id: worker,
        })
      ).status === 400,
    );
    const receipt = await success("Anonymous QA safety submission", "/safety", {
      organization_id: build,
      category: "equipment",
      priority: "normal",
      description:
        marker + ": synthetic guardrail inspection, no personal details.",
    });
    check(
      "Random anonymous credentials have expected formats",
      /^FS-[A-F0-9]{16}$/.test(receipt.reference) &&
        /^[a-f0-9]{64}$/.test(receipt.token),
    );
    check(
      "Invalid tracking credentials rejected",
      (
        await api("/safety/track", {
          reference: receipt.reference,
          token: "0".repeat(64),
        })
      ).status === 404,
    );
    const adminState = await success(
      "Admin can locate new QA safety case",
      "/workspace",
      undefined,
      a,
    );
    const report = adminState.safety_reports.find(
      (r) => r.reference === receipt.reference,
    );
    check(
      "Safety case contains neither reporter identity nor secret hash",
      !!report &&
        !("worker_id" in report) &&
        !("user_id" in report) &&
        !("token_hash" in report),
    );
    const update = {
      report_id: report.id,
      status: "acknowledged",
      note: marker + ": synthetic supervisor action.",
    };
    check(
      "Worker safety update denied",
      (await api("/safety/update", update, w)).status === 403,
    );
    check(
      "Foreign-tenant safety update denied",
      (await api("/safety/update", update, ha)).status === 403,
    );
    check(
      "Safety workflow cannot skip statuses",
      (
        await api(
          "/safety/update",
          {
            ...update,
            status: "closed",
          },
          a,
        )
      ).status === 403,
    );
    for (const status of [
      "acknowledged",
      "under_review",
      "action_assigned",
      "mitigated",
      "closed",
    ]) {
      await success(
        `Admin advances new QA safety case to ${status}`,
        "/safety/update",
        { ...update, status },
        a,
      );
    }
    const tracked = await success(
      "Anonymous reporter retrieves updated QA safety history",
      "/safety/track",
      receipt,
    );
    check(
      "Tracked case is closed with six chronological events",
      tracked.status === "closed" &&
        tracked.events.length === 6 &&
        tracked.events.every(
          (e, i, all) =>
            !i || Date.parse(e.created_at) >= Date.parse(all[i - 1].created_at),
        ),
    );
    const first = await success(
      "Admin creates new QA overnight hospital shift",
      "/shifts",
      {
        ...shiftBody,
        organization_id: hospital,
        worker_id: hospitalWorker,
        starts_at: "2026-10-18T19:00:00+05:30",
        ends_at: "2026-10-19T07:00:00+05:30",
        break_minutes: 60,
        location: marker + " overnight",
      },
      ha,
    );
    fixtures.push({ kind: "hospital-overnight", id: first.data });
    const next = {
      ...shiftBody,
      organization_id: hospital,
      worker_id: hospitalWorker,
      starts_at: "2026-10-19T13:00:00+05:30",
      ends_at: "2026-10-19T21:30:00+05:30",
      location: marker + " next shift",
    };
    const second = await success(
      "Admin creates new QA short-rest hospital shift",
      "/shifts",
      next,
      ha,
    );
    fixtures.push({ kind: "hospital-next", id: second.data });
    const warned = await success(
      "Hospital RestGuard loads QA risks",
      "/workspace",
      undefined,
      ha,
    );
    check(
      "Six-hour overnight rest risk is detected",
      warned.risks.some(
        (r) => r.shiftId === second.data && r.type === "short_rest",
      ),
    );
    await success(
      "Explicit admin confirmation reschedules only new QA shift",
      "/shifts",
      {
        ...next,
        id: second.data,
        starts_at: "2026-10-19T18:00:00+05:30",
        ends_at: "2026-10-20T02:30:00+05:30",
      },
      ha,
    );
    const changed = await success(
      "QA schedule change and event persist",
      "/workspace",
      undefined,
      ha,
    );
    check(
      "Eleven-hour rest clears QA warning",
      !changed.risks.some(
        (r) => r.shiftId === second.data && r.type === "short_rest",
      ),
    );
    check(
      "Existing hospital schedules remain unchanged",
      baselineHospital.every((s) => {
        const now = changed.shifts.find((n) => n.id === s.id);
        return now?.starts_at === s.starts_at && now?.ends_at === s.ends_at;
      }),
    );
  }
  for (const language of ["en", "ta", "hi"]) {
    const explanation = await success(
      `${language} Saarthi explanation or fallback`,
      "/assistant",
      {
        topic: "pay",
        language,
        shift_id: "30000000-0000-4000-8000-000000000001",
      },
      w,
    );
    check(
      `${language} explanation contract valid`,
      ["fallback", "gemini"].includes(explanation.source) &&
        typeof explanation.explanation === "string" &&
        explanation.explanation.length > 20 &&
        typeof explanation.nextAction === "string",
    );
    checks.push(`${language} provider result: ${explanation.source}`);
  }
  stage = "browser authentication and expired-session recovery";
  browser = await chromium.launch({
    channel: process.platform === "win32" ? "chrome" : undefined,
    headless: true,
    env: { ...process.env, TEMP: temp, TMP: temp },
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  if (mutate) {
    stage = "anonymous safety form and tracking UI";
    await page.goto(origin + "/safety");
    await page.getByLabel("Organization", { exact: true }).selectOption(build);
    await page
      .getByLabel("What happened?", { exact: true })
      .fill(marker + ": synthetic safety form verification.");
    await page
      .getByRole("button", { name: "Submit anonymous concern", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Concern submitted", exact: true })
      .waitFor();
    const receipt = page.locator(".credential-receipt");
    const reference = (await receipt.locator("dd").nth(0).innerText()).trim();
    const token = (await receipt.locator("dd").nth(1).innerText()).trim();
    check(
      "Anonymous safety UI generates tracking credentials",
      /^FS-[A-F0-9]{16}$/.test(reference) && /^[a-f0-9]{64}$/.test(token),
    );
    await page
      .getByRole("button", { name: "Track a concern", exact: true })
      .last()
      .click();
    await page
      .getByRole("button", { name: "Check status", exact: true })
      .click();
    await page.locator(".tracked-case").waitFor();
    check(
      "Anonymous tracking UI loads persisted case",
      (await page.locator(".tracked-case").innerText()).includes("Submitted"),
    );
    const state = await success(
      "Read UI-created QA concern as admin",
      "/workspace",
      undefined,
      a,
    );
    const report = state.safety_reports.find((r) => r.reference === reference);
    check("UI-created concern persisted", !!report);
    await success(
      "Admin acknowledges UI-created QA concern",
      "/safety/update",
      {
        report_id: report.id,
        status: "acknowledged",
        note: marker + ": synthetic UI tracking acknowledgement.",
      },
      a,
    );
    await page
      .getByRole("button", { name: "Check status", exact: true })
      .click();
    await page.waitForFunction(() =>
      document
        .querySelector(".tracked-case")
        ?.textContent?.includes("Acknowledged"),
    );
    check("Anonymous tracking UI sees administrator update", true);
    for (const status of [
      "under_review",
      "action_assigned",
      "mitigated",
      "closed",
    ]) {
      await success(
        `Close UI QA concern through ${status}`,
        "/safety/update",
        {
          report_id: report.id,
          status,
          note: marker + ": complete synthetic UI verification.",
        },
        a,
      );
    }
  }
  stage = "normal worker sign-in and session restoration";
  await page.goto(origin + "/login");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("construction.worker@demo.fairshift.example");
  // No tracing or automatic screenshots: the password stays only in browser/process memory.
  await page.getByLabel("Password", { exact: true }).fill(env.DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("heading", { name: /Good to see you/ }).waitFor();
  await page.reload();
  await page.getByRole("heading", { name: /Good to see you/ }).waitFor();
  check("Browser session restored after refresh", true);
  await page.getByRole("link", { name: "My pay", exact: true }).click();
  await page
    .getByRole("heading", { name: "Your hours. Your earnings. In sync." })
    .waitFor();
  await page.setViewportSize({ width: 360, height: 800 });
  check(
    "Mobile pay view has no horizontal overflow",
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.setViewportSize({ width: 1280, height: 900 });
  if (!process.env.BACKEND_VERIFY_URL) {
    await page.route("**/api/workspace", (r) =>
      r.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Session expired. Sign in again." }),
      }),
    );
    await page.reload();
    await page.getByRole("heading", { name: "Sign in", exact: true }).waitFor();
    check(
      "Rejected session clears local identity and returns to sign-in",
      true,
    );
    await page.unroute("**/api/workspace");
  } else {
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.getByRole("heading", { name: "Sign in", exact: true }).waitFor();
    check("Live worker logout returns to sign-in", true);
  }
  await page.goto(origin + "/");
  await page
    .getByRole("button", { name: "Explore employer demo", exact: true })
    .click();
  await page.getByRole("heading", { name: "Overview.", exact: true }).waitFor();
  await page.getByLabel("Demo industry").selectOption("healthcare");
  await page.waitForFunction(() =>
    document
      .querySelector(".workspace-tag")
      ?.textContent?.includes("Lotus Care Hospital"),
  );
  await page.getByRole("link", { name: "RestGuard", exact: true }).click();
  await page.locator(".whatif-card").waitFor();
  const before = await api("/workspace", undefined, ha);
  await page.getByRole("slider", { name: "Schedule what-if" }).fill("13");
  check(
    "Browser what-if shows six-hour warning",
    (await page.locator(".whatif-card").innerText()).includes("6h rest window"),
  );
  await page.getByRole("slider", { name: "Schedule what-if" }).fill("18");
  check(
    "Browser what-if clears at eleven hours",
    (await page.locator(".whatif-card").innerText()).includes(
      "Rest policy met",
    ),
  );
  const after = await api("/workspace", undefined, ha);
  check(
    "Browser preview never saves hospital schedules",
    before.data.shifts.every((s) => {
      const now = after.data.shifts.find((n) => n.id === s.id);
      return now?.starts_at === s.starts_at && now?.ends_at === s.ends_at;
    }),
  );
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByRole("heading", { name: "Sign in", exact: true }).waitFor();
  check("Employer browser logout", true);
  await context.close();
} catch {
  failed = true;
} finally {
  if (browser) await browser.close();
  if (server) server.kill();
  const result = {
    origin,
    syntheticWritesEnabled: mutate,
    status: failed ? "failed" : "passed",
    checks,
    checkCount: checks.length,
    ...(failed ? { failedStage: stage } : {}),
    addedQARecords: fixtures,
    secretsRecorded: false,
  };
  writeFileSync(
    resolve(
      ".local",
      process.env.BACKEND_VERIFY_URL
        ? "backend-live-results.json"
        : "backend-local-results.json",
    ),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
}
if (failed) process.exitCode = 1;
