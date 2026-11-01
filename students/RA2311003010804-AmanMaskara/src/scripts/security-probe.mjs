// Black-box security probes against a deployed FairShift: `npm run probe -- https://your-deployment`.
// Read-only: no record is created or changed. Needs demo logins (DEMO_MODE=true) for the signed-in checks.
import { chromium } from "@playwright/test";
const BASE = process.argv[2] ?? "https://fairshift-ashy.vercel.app";
const host = new URL(BASE).host;
const results = [];
const check = (name, pass, detail = "") => results.push({ name, pass, detail });
const req = (path, init = {}) => fetch(BASE + path, { redirect: "manual", ...init });

// Headers
const home = await req("/");
const h = (k) => home.headers.get(k) ?? "";
check(
  "CSP with per-request nonce, no unsafe-eval",
  /script-src 'self' 'nonce-/.test(h("content-security-policy")) && !/unsafe-eval/.test(h("content-security-policy")),
);
check(
  "CSP frame-ancestors / object-src none",
  /frame-ancestors 'self'/.test(h("content-security-policy")) && /object-src 'none'/.test(h("content-security-policy")),
);
check(
  "HSTS ≥ 1 year",
  /max-age=(\d+)/.test(h("strict-transport-security")) &&
    Number(h("strict-transport-security").match(/max-age=(\d+)/)[1]) >= 31536000,
);
check("nosniff", h("x-content-type-options") === "nosniff");
check("COOP same-origin", h("cross-origin-opener-policy") === "same-origin", h("cross-origin-opener-policy"));
check("Referrer-Policy set", Boolean(h("referrer-policy")), h("referrer-policy"));
check("Permissions-Policy set", Boolean(h("permissions-policy")));
check("no X-Powered-By", !home.headers.has("x-powered-by"));
const nonce1 = h("content-security-policy").match(/nonce-([^']+)/)?.[1];
const nonce2 = (await req("/")).headers.get("content-security-policy")?.match(/nonce-([^']+)/)?.[1];
check("CSP nonce changes per request", nonce1 && nonce2 && nonce1 !== nonce2);

// Anonymous access
for (const path of ["/api/payroll", "/api/payroll/template", "/api/on-duty"]) {
  const r = await req(path);
  check(`anonymous GET ${path} → 401`, r.status === 401, String(r.status));
}
for (const path of ["/a", "/a/payroll", "/w", "/w/pay"]) {
  const r = await req(path);
  check(
    `anonymous ${path} → login`,
    r.status >= 300 && r.status < 400 && /\/login/.test(r.headers.get("location") ?? ""),
    `${r.status} ${r.headers.get("location")}`,
  );
}
// Checkout: the return link and the checkout page are for the employer only.
const someBatch = "fs202610_000000000000";
for (const path of [`/api/checkout/return?batch=${someBatch}`, `/a/payroll/checkout/${someBatch}`]) {
  const r = await req(path);
  check(
    `anonymous ${path.split("?")[0]} → login`,
    r.status >= 300 && r.status < 400 && /\/login/.test(r.headers.get("location") ?? ""),
    `${r.status} ${r.headers.get("location")}`,
  );
}
const forged = await req("/a", { headers: { cookie: "fs_session=eyJ1aWQiOiJhZG1pbjEiLCJyb2xlIjoiYWRtaW4ifQ.forged" } });
check("forged admin cookie → login", /\/login/.test(forged.headers.get("location") ?? ""), String(forged.status));
check("cron without secret → 401", (await req("/api/cron/hazards", { method: "POST" })).status === 401);
check(
  "cron with wrong secret → 401",
  (await req("/api/cron/hazards", { method: "POST", headers: { authorization: "Bearer guess" } })).status === 401,
);

// Cross-site and oversized requests
const evil = { origin: "https://evil.example", "content-type": "application/json" };
check(
  "cross-site POST /api/sync → 403",
  (await req("/api/sync", { method: "POST", headers: evil, body: "{}" })).status === 403,
);
check(
  "cross-site POST /api/tts → 403",
  (await req("/api/tts", { method: "POST", headers: evil, body: "{}" })).status === 403,
);
check(
  "cross-site POST /api/voice/hazard → 403",
  (await req("/api/voice/hazard", { method: "POST", headers: evil, body: "{}" })).status === 403,
);
const big = "x".repeat(300_000);
const tts = await req("/api/tts", {
  method: "POST",
  headers: { "content-type": "application/json", origin: BASE },
  body: big,
});
check("oversized /api/tts body → 413", tts.status === 413, String(tts.status));
const tts2 = await req("/api/tts", {
  method: "POST",
  headers: { "content-type": "application/json", origin: BASE },
  body: JSON.stringify({ text: "anything at all", locale: "en" }),
});
check("anonymous TTS of arbitrary text → 401", tts2.status === 401, String(tts2.status));
const badJson = await req("/api/tts", {
  method: "POST",
  headers: { "content-type": "application/json", origin: BASE },
  body: "{not json",
});
check(
  "malformed JSON → 400, no stack trace",
  badJson.status === 400 && !/at \w+ \(|node_modules/.test(await badJson.text()),
);

// Tampered share links, traversal and unknown pages
for (const path of ["/certificate/abc.def", "/passport/abc.def"]) {
  const body = await (await req(path)).text();
  check(
    `${path} → "could not be verified", noindex, no data`,
    /could not be verified/.test(body) && /noindex/.test(body) && !/at \w+ \(|node_modules|w100\d/.test(body),
  );
}
const traversal = await req("/certificate/..%2F..%2Fetc%2Fpasswd");
const traversalBody = await traversal.text();
// Rejected either by the platform (4xx, as on Vercel) or by the page itself ("could not be verified",
// as on a plain `next start`); never any file content or stack trace.
check(
  "path traversal rejected",
  (traversal.status >= 400 || /could not be verified/.test(traversalBody)) &&
    !/root:|at \w+ \(|node_modules/.test(traversalBody),
  String(traversal.status),
);
const missing = await req("/no-such-page");
check("/no-such-page → friendly 404", missing.status === 404 && !/at \w+ \(|node_modules/.test(await missing.text()));

// A signed-in worker
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(BASE + "/login");
await page
  .getByRole("button", { name: /Ramesh/ })
  .first()
  .click();
await page.waitForURL(/\/w/);
const cookie = (await ctx.cookies()).find((c) => c.name === "fs_session");
check(
  "session cookie HttpOnly + Secure + SameSite=Lax",
  cookie?.httpOnly && cookie?.secure && cookie?.sameSite === "Lax",
  JSON.stringify({ httpOnly: cookie?.httpOnly, secure: cookie?.secure, sameSite: cookie?.sameSite }),
);
check(
  "session cookie not readable from JavaScript",
  !(await page.evaluate(() => document.cookie)).includes("fs_session"),
);
const asWorker = await page.evaluate(async () =>
  Promise.all(["/api/payroll", "/api/on-duty", "/api/payroll/template"].map(async (p) => (await fetch(p)).status)),
);
check(
  "worker → manager APIs all 401",
  asWorker.every((s) => s === 401),
  asWorker.join(","),
);
await page.goto(BASE + "/a/payroll");
check("worker opening /a/payroll lands on /w", new URL(page.url()).pathname === "/w", page.url());
const syncBad = await page.evaluate(
  async () =>
    (
      await fetch("/api/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ops: [{ type: "drop_table" }] }),
      })
    ).status,
);
check("worker sync with invalid ops → 400", syncBad === 400, String(syncBad));
await page.goto(`${BASE}/a/payroll/checkout/${someBatch}`);
check("worker opening a checkout page lands on /w", new URL(page.url()).pathname === "/w", page.url());
const workerReturn = await page.evaluate(async (path) => {
  const r = await fetch(path, { redirect: "manual" });
  return r.type === "opaqueredirect" ? "redirect" : String(r.status);
}, `/api/checkout/return?batch=${someBatch}`);
check("worker hitting the checkout return link is turned away", workerReturn === "redirect", workerReturn);

// A signed-in employer: forged checkout ids change nothing, and no full bank account reaches the page.
const adminCtx = await browser.newContext();
const admin = await adminCtx.newPage();
await admin.goto(BASE + "/login");
await admin.getByRole("button", { name: /Priya/ }).first().click();
await admin.waitForURL(/\/a/);
for (const batch of [someBatch, "..%2F..%2Fadmin", "fs202610_<script>"]) {
  await admin.goto(`${BASE}/api/checkout/return?batch=${batch}`);
  check(
    `employer return link with a forged id (${batch.slice(0, 14)}) → back to payroll`,
    new URL(admin.url()).pathname === "/a/payroll",
    admin.url(),
  );
}
await admin.goto(`${BASE}/a/payroll/checkout/${someBatch}`);
// Admin pages stream behind a loading screen, so this redirect completes in the browser.
await admin.waitForURL((url) => url.pathname === "/a/payroll", { timeout: 15_000 }).catch(() => {});
check(
  "employer opening an unknown checkout → back to payroll",
  new URL(admin.url()).pathname === "/a/payroll",
  admin.url(),
);
await admin.goto(BASE + "/a/payroll");
const payrollHtml = await admin.content();
const fullAccounts = [
  "026291800001191",
  "00011020001772",
  "1233943142",
  "388108022658",
  "000890289871772",
  "000100289877623",
];
check(
  "payroll page shows bank accounts masked, never in full or encrypted",
  /••••\d{4}/.test(payrollHtml) &&
    !fullAccounts.some((a) => payrollHtml.includes(a)) &&
    // nor the stored ciphertext ("v1.<key id>.<iv>.<tag>.<data>")
    !/v1\.[\w-]{8}\.[\w-]{16}\./.test(payrollHtml),
);
await browser.close();

const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.pass ? "" : `  (${r.detail})`}`);
console.log(`\n${results.length - failed.length}/${results.length} probes passed against ${host}`);
process.exit(failed.length ? 1 : 0);
