import { test, expect, vi } from "vitest";
import express from "express";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
const state = vi.hoisted(() => ({ fixture: null }));
vi.mock("../server/supabase.js", () => ({
  userClient: (token) => state.fixture.client(token),
  safetyGateway: async () => state.fixture.gateway(),
}));
import { createApp } from "../server/app";
import { createFixture } from "./support/supabase-fixture.mjs";
test("all browser specifications against isolated real application and PostgreSQL", async () => {
  const root = process.cwd(),
    origin = "http://127.0.0.1:8188",
    key = randomBytes(24).toString("hex");
  state.fixture = await createFixture(root, origin);
  Object.assign(process.env, {
    SUPABASE_URL: origin,
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_isolated_fixture",
    ENABLE_DEMO: "true",
    ENABLE_SAAS: "true",
    GOOGLE_AUTH_ENABLED: "false",
    APP_ORIGIN: origin,
    DEMO_PASSWORD: state.fixture.password,
    NODE_ENV: "production",
    GEMINI_API_KEY: "",
    GEMINI_MODEL: "",
    RESEND_API_KEY: "",
    INVITATION_FROM_EMAIL: "",
  });
  const endpoints = new Map();
  const app = createApp({
    rateGuard: async () => ({ allowed: true, retryAfter: 60 }),
  });
  const transport = express();
  transport.use((req, res, next) => {
    res.on("finish", () => {
      if (req.path.startsWith("/api/")) {
        const k = req.method + " " + req.path + " " + res.statusCode;
        endpoints.set(k, (endpoints.get(k) ?? 0) + 1);
      }
    });
    next();
  });
  transport.use(app);
  state.fixture.authRoutes(transport, key);
  transport.use(express.static(resolve(root, "dist")));
  transport.get("/{*path}", (req, res) =>
    req.path.startsWith("/api/")
      ? res.status(404).json({ error: "Not found" })
      : res.sendFile(resolve(root, "dist/index.html")),
  );
  const server = await new Promise((r) => {
    const s = transport.listen(8188, "127.0.0.1", () => r(s));
  });
  try {
    const require = createRequire(import.meta.url),
      child = spawn(
        process.execPath,
        [
          require.resolve("@playwright/test/cli"),
          "test",
          "--reporter=list",
          ...(process.env.QA_GREP ? ["--grep", process.env.QA_GREP] : []),
        ],
        {
          windowsHide: true,
          env: {
            ...process.env,
            TEST_BASE_URL: origin,
            QA_ISOLATED: "true",
            QA_FIXTURE_KEY: key,
            TEMP: resolve(root, ".local/tmp"),
            TMP: resolve(root, ".local/tmp"),
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
    let output = "";
    child.stdout.on("data", (b) => {
      output += b;
      process.stdout.write(b);
    });
    child.stderr.on("data", (b) => {
      output += b;
      process.stderr.write(b);
    });
    const code = await new Promise((r) => child.on("close", r));
    writeFileSync(
      resolve(root, ".local/functional-isolated-browser.txt"),
      output,
    );
    writeFileSync(
      resolve(root, ".local/functional-endpoints.json"),
      JSON.stringify(
        [...endpoints.entries()].map(([key, count]) => ({
          request: key,
          count,
        })),
        null,
        2,
      ),
    );
    expect(
      code,
      "See sanitized browser assertion results in .local/functional-isolated-browser.txt",
    ).toBe(0);
  } finally {
    await new Promise((r) => server.close(r));
    await state.fixture.close();
  }
}, 300000);
