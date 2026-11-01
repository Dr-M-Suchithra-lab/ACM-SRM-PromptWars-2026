import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../server/app";
const app = createApp({
  rateGuard: async () => ({ allowed: true, retryAfter: 60 }),
});
describe("API request boundary", () => {
  it("serves health with security headers", async () => {
    const r = await request(app).get("/health");
    expect(r.status).toBe(200);
    expect(r.headers["x-content-type-options"]).toBe("nosniff");
    expect(r.headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
  });
  it("requires authentication on business endpoints", async () =>
    expect((await request(app).get("/api/workspace")).status).toBe(401));
  it("protects review mutation", async () =>
    expect((await request(app).post("/api/reviews").send({})).status).toBe(
      401,
    ));
  it("does not expose backend credentials through config", async () => {
    const r = await request(app).get("/api/config");
    expect(Object.keys(r.body).sort()).toEqual([
      "aiConfigured",
      "demoEnabled",
      "googleEnabled",
      "publishableKey",
      "saasEnabled",
      "url",
    ]);
    expect(r.headers["cache-control"]).toBe("no-store");
  });
  it("rejects malformed safety reports before persistence", async () =>
    expect(
      (await request(app).post("/api/safety").send({ description: "short" }))
        .status,
    ).toBe(400));
  it("rejects malformed tracking tokens", async () =>
    expect(
      (
        await request(app)
          .post("/api/safety/track")
          .send({ reference: "no", token: "bad" })
      ).status,
    ).toBe(400));
  it("rejects oversized payloads", async () =>
    expect(
      (
        await request(app)
          .post("/api/safety")
          .send({ description: "x".repeat(25000) })
      ).status,
    ).toBe(413));
  it("rejects invalid JSON", async () =>
    expect(
      (
        await request(app)
          .post("/api/safety")
          .set("Content-Type", "application/json")
          .send("{not json}")
      ).status,
    ).toBe(400));
});
