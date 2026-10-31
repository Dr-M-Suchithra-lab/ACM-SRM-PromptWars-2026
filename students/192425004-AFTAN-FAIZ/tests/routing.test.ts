import { describe, it, expect } from "vitest";
import configuration from "../vercel.json";
describe("Vercel client-route refreshes", () => {
  it.each([
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/auth/callback",
    "/invite",
    "/onboarding",
    "/terms",
    "/privacy",
  ])("serves the SPA for %s without swallowing API routing", (path) => {
    expect(configuration.rewrites).toContainEqual({
      source: path,
      destination: "/index.html",
    });
  });
  it("keeps the health function and protected workspace rewrite", () => {
    expect(configuration.rewrites).toContainEqual({
      source: "/health",
      destination: "/api/health",
    });
    expect(configuration.rewrites).toContainEqual({
      source: "/app/:path*",
      destination: "/index.html",
    });
    expect(
      configuration.rewrites.some((r) => r.source.startsWith("/api/")),
    ).toBe(false);
  });
});
