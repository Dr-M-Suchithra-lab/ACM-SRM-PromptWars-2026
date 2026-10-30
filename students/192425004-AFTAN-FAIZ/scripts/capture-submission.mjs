// Run after npm run build. Optional SUBMISSION_ENV_FILE is read into memory only.
// Defaults to this folder's .env; never copies credentials or saves browser sessions.
// Uses only demo login and read-only UI navigation; no business records are changed.
import { chromium } from '@playwright/test';
import { parse } from 'dotenv';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
assert(existsSync(resolve(root, 'prompts.md')), 'Run from the submission folder');
const output = resolve(root, 'screenshots');
const temporary = resolve(root, '.local/tmp');
mkdirSync(output, { recursive: true });
mkdirSync(temporary, { recursive: true });
const envFile = process.env.SUBMISSION_ENV_FILE || resolve(root, '.env');
const env = existsSync(envFile) ? parse(readFileSync(envFile)) : {};
const port = '8188';
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['dist-server/index.js'], {
  cwd: root,
  env: { ...process.env, ...env, NODE_ENV: 'production', PORT: port,
    TEMP: temporary, TMP: temporary },
  windowsHide: true,
  stdio: 'ignore',
});
let browser;
const checks = [];
const screenshots = [];
const pageErrors = [];
let failure;
try {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    try { ready = (await fetch(`${origin}/health`)).ok; } catch {}
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert(ready, 'Local submitted build did not start');
  const health = await (await fetch(`${origin}/health`)).json();
  assert.equal(health.service, 'NYAVERIS AI');
  checks.push('Submitted production build health and application name');
  assert.equal((await fetch(`${origin}/api/workspace`)).status, 401);
  checks.push('Unauthenticated workspace denied');
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ||
    (process.platform === 'win32' ? 'chrome' : undefined),
    headless: true, env: { ...process.env, TEMP: temporary, TMP: temporary } });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => pageErrors.push(error.name));
  await page.route(`${origin}/api/**`, async route => {
    const request = route.request();
    if (!['GET', 'HEAD'].includes(request.method()) &&
      new URL(request.url()).pathname !== '/api/demo-session')
      return route.abort('blockedbyclient');
    return route.continue();
  });
  async function capture(name) {
    await page.evaluate(() => document.fonts.ready);
    const text = await page.locator('body').innerText();
    assert(!/FairShift|Saakshi/i.test(text), 'Previous visible branding found');
    assert((await page.title()).includes('NYAVERIS AI'));
    await page.screenshot({ path: resolve(output, name), fullPage: !['proofloop.png', 'worker-mobile.png'].includes(name),
      animations: 'disabled' });
    screenshots.push(name);
  }
  async function login(role) {
    await page.goto(origin);
    const button = page.getByRole('button', { name:
      role === 'worker' ? 'Explore worker demo' : 'Explore employer demo', exact: true });
    await button.waitFor({ state: 'visible' });
    assert(await button.isEnabled(), 'Synthetic demo login unavailable');
    await button.click();
    await page.locator('.workspace-tag').waitFor();
    await page.getByRole('link', { name: role === 'worker' ? 'My pay' : 'Workforce',
      exact: true }).waitFor();
    // Wait for authenticated data, rather than a skeleton dashboard.
    await page.waitForFunction(() => !document.body.innerText.includes('Loading workspace'));
  }
  await page.goto(origin);
  await page.locator('.landing-nav .brand').waitFor();
  assert.equal((await page.locator('.landing-nav .brand').innerText()).replace(/\s+/g, ' '), 'NYAVERIS AI');
  await capture('landing-page.png');
  checks.push('Landing title, exact wordmark and previous-brand absence');
  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await page.getByRole('heading', { name: 'Sign in', exact: true }).waitFor();
  await capture('login-page.png');
  checks.push('Sign-in page navigation');
  await page.goto(`${origin}/safety`);
  await page.getByLabel('What happened?', { exact: true }).waitFor();
  await capture('safesignal.png');
  checks.push('SafeSignal anonymous form rendered without submission');
  await login('worker');
  await page.getByRole('heading', { name: /Good to see you/ }).waitFor();
  await capture('worker-dashboard.png');
  checks.push('Worker synthetic authentication and populated dashboard');
  await page.getByRole('link', { name: 'My pay', exact: true }).click();
  await page.getByRole('heading', { name: 'Your hours. Your earnings. In sync.' }).waitFor();
  await page.locator('.pay-record').first().waitFor();
  await capture('fairness-twin.png');
  const replay = page.locator('.pay-record').filter({ hasText: '26 Oct 2026' })
    .getByRole('button', { name: 'Fairness Replay', exact: true });
  await replay.click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  assert((await dialog.innerText()).includes('PROOFLOOP'));
  await capture('proofloop.png');
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  checks.push('Fairness Twin pay records and persisted ProofLoop replay');
  await page.setViewportSize({ width: 360, height: 800 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await capture('worker-mobile.png');
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.locator('.demo-strip').getByRole('button',
    { name: 'Employer command center', exact: true }).click();
  await page.getByRole('link', { name: 'Workforce', exact: true }).waitFor();
  await page.locator('.welcome-banner').waitFor();
  await capture('admin-dashboard.png');
  checks.push('Employer synthetic authentication and dashboard');
  await page.getByLabel('Demo industry').selectOption('healthcare');
  await page.waitForFunction(() => document.querySelector('.workspace-tag')?.textContent
    ?.includes('Lotus Care Hospital'));
  await page.getByRole('link', { name: 'RestGuard', exact: true }).click();
  await page.getByRole('heading', { name: 'Make room for recovery.' }).waitFor();
  await page.locator('.whatif-card').waitFor();
  await page.getByRole('slider', { name: 'Schedule what-if' }).fill('13');
  assert((await page.locator('.whatif-card').innerText()).includes('6h rest window'));
  await capture('restguard.png');
  await page.getByRole('slider', { name: 'Schedule what-if' }).fill('18');
  assert((await page.locator('.whatif-card').innerText()).includes('Rest policy met'));
  checks.push('RestGuard healthcare what-if preview; no schedule saved');
  assert.deepEqual(pageErrors, []);
  await context.close();
} catch (error) {
  // Controlled assertion text only; never serialize network headers, sessions or request bodies.
  failure = error instanceof assert.AssertionError ? error.message :
    `${error.name}: browser navigation/capture failed; inspect selectors and connectivity`;
} finally {
  if (browser) await browser.close();
  server.kill();
  const result = { capturedAt: new Date().toISOString(), origin,
    source: 'Submitted production build with existing synthetic Supabase backend',
    status: failure ? 'partial' : 'passed', checks, screenshots, pageErrors,
    ...(failure ? { failure } : {}) };
  writeFileSync(resolve(root, '.local/browser-results.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}
if (failure) process.exitCode = 1;
