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
  it("routes every API path including nested mutations to the actual Express function", () => {
    expect(configuration.rewrites[0]).toEqual({
      source: "/api/:path*",
      destination: "/api/[...path]",
    });
    expect(configuration.rewrites).toContainEqual({
      source: "/health",
      destination: "/api/health",
    });
    expect(configuration.rewrites).toContainEqual({
      source: "/app/:path*",
      destination: "/index.html",
    });
  });
});
