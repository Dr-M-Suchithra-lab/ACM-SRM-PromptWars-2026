import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["tests/functional.integration.mjs"],
    maxWorkers: 1,
    testTimeout: 300000,
  },
});
