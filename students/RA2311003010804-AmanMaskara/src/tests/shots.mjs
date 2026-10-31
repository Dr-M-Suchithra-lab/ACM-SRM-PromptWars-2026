// Visual QA: screenshots of every screen at phone and laptop widths. Not part of CI.
// Usage: npx next start -p 3100 (DEMO_MODE=true), then: node tests/shots.mjs <out-dir>
import { mkdirSync } from "node:fs";
import { chromium, devices } from "@playwright/test";

const BASE = "http://localhost:3100";
const OUT = process.argv[2] ?? "shots";
mkdirSync(OUT, { recursive: true });

const personas = [
  ["Ramesh", ["/w", "/w/checkin", "/w/pay", "/w/report", "/w/feedback", "/w/skills"]],
  ["Sunita", ["/w", "/w/feedback", "/w/skills"]],
  ["Priya", ["/a", "/a/hazards", "/a/people", "/a/feedback", "/a/payroll", "/a/sites", "/a/kiosk/site1"]],
  ["Arjun", ["/a", "/a/hazards"]],
];

const browser = await chromium.launch();
for (const [label, ctxOpts] of [
  ["phone", { ...devices["Pixel 7"] }],
  ["laptop", { viewport: { width: 1366, height: 860 } }],
]) {
  const ctx = await browser.newContext({ ...ctxOpts, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const snap = async (name) => {
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/${label}-${name}.png`, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) console.log(`OVERFLOW ${label} ${name}: ${overflow}px`);
  };
  for (const path of ["/", "/start", "/login", "/nope"]) {
    await page.goto(BASE + path);
    await snap(path === "/" ? "landing" : path.slice(1));
  }
  for (const [persona, list] of personas) {
    await page.goto(BASE + "/login");
    await page
      .getByRole("button", { name: new RegExp(persona) })
      .first()
      .click();
    await page.waitForURL(/\/(w|a)(\?.*)?$/);
    for (const path of list) {
      await page.goto(BASE + path);
      await snap(`${persona}${path.replaceAll("/", "_")}`);
    }
    await ctx.clearCookies();
  }
  await ctx.close();
}
await browser.close();
console.log("done");
