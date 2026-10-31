import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` throws outside React Server Components; tests import server modules directly.
      "server-only": fileURLToPath(new URL("./tests/stubs/empty.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/core/**/*.ts", "src/server/**/*.ts", "src/lib/**/*.ts"],
      exclude: [
        // Thin "use server" wrappers (auth + Zod + rate limit → service); covered end to end by Playwright.
        "src/server/actions/**",
        // Demo data, not logic.
        "src/server/seed/**",
        // Draws on a real <canvas>; exercised in the browser by the photo step of the hazard report.
        "src/lib/image.ts",
        // Needs a live MongoDB; it implements the same Repos contract the in-memory store is tested against.
        "src/server/repos/mongo.ts",
      ],
      thresholds: {
        // The whole measured codebase…
        lines: 95,
        statements: 93,
        functions: 93,
        branches: 85,
        // …and stricter for the pay, fatigue, risk and token rules everything else relies on.
        "src/core/**": { lines: 95, branches: 95, functions: 95, statements: 95 },
      },
    },
  },
});
