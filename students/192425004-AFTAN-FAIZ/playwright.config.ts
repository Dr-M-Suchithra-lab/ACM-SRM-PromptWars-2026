import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  retries: 0,
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:5173",
    // Auth responses and anonymous receipts contain credentials. Capture only
    // explicitly reviewed screenshots; never persist automatic failure artifacts.
    trace: "off",
    screenshot: "off",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel:
          process.env.PLAYWRIGHT_CHANNEL ||
          (process.platform === "win32" ? "chrome" : undefined),
      },
    },
  ],
  reporter: [["list"], ["html", { open: "never" }]],
});
