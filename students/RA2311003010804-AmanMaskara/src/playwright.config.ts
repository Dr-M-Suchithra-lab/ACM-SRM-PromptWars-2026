import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  // One local server serves every browser; too many parallel workers just time each other out.
  workers: process.env.CI ? 2 : 3,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    // Entrance animations and the welcome moment collapse to short fades, so tests and axe see final states.
    reducedMotion: "reduce",
  },
  projects: [{ name: "mobile-chromium", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: {
      DEMO_MODE: "true",
      SESSION_SECRET: "e2e-session-secret-0123456789abcdef",
      // Always the simulated checkout: tests must never reach a real Cashfree account, even when
      // .env.local holds test keys (an empty value here wins over .env.local).
      CASHFREE_APP_ID: "",
      CASHFREE_SECRET_KEY: "",
    },
  },
});
