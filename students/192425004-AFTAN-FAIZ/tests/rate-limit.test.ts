import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../server/app";
import { rateBucket } from "../server/rate-limit";
describe("stateless request throttling", () => {
  it("stores only a keyed digest instead of a raw IP", () => {
    const key = rateBucket(
      "192.0.2.1",
      "safety_submit",
      "a server-only random secret",
    );
    expect(key).toMatch(/^[a-f0-9]{64}$/);
    expect(key).not.toContain("192.0.2.1");
    expect(key).not.toBe(
      rateBucket("192.0.2.1", "login", "a server-only random secret"),
    );
  });
  it("returns a clear 429 and retry window from a shared guard", async () => {
    const app = createApp({
      rateGuard: async () => ({ allowed: false, retryAfter: 42 }),
    });
    const r = await request(app).post("/api/safety").send({});
    expect(r.status).toBe(429);
    expect(r.headers["retry-after"]).toBe("42");
    expect(r.body.error).toContain("Too many requests");
  });
  it("fails closed when the shared limiter is unavailable", async () => {
    const app = createApp({
      rateGuard: async () => {
        throw new Error("DB unavailable");
      },
    });
    const r = await request(app).post("/api/safety").send({});
    expect(r.status).toBe(503);
    expect(r.body.error).not.toContain("DB unavailable");
  });
  it("keeps health independent of application data and limiter failures", async () => {
    const app = createApp({
      rateGuard: async () => {
        throw new Error("DB unavailable");
      },
    });
    expect((await request(app).get("/api/health")).status).toBe(200);
  });
});
