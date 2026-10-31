import { describe, expect, it, vi } from "vitest";
import { RateLimiter } from "@/server/rate-limit";
import { hashSecret, verifySecret } from "@/server/password";
import { _sign, _verify, type SessionPayload } from "@/server/session";
import { formatDuration, formatINR } from "@/lib/format";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

const future = () => Math.floor(Date.now() / 1000) + 3600;
const payload = (exp = future()): SessionPayload => ({
  uid: "w1001",
  role: "worker",
  orgId: "org1",
  siteId: "site1",
  exp,
});

describe("session tokens", () => {
  it("round-trips a signed payload", () => {
    const p = payload();
    expect(_verify(_sign(p))).toEqual(p);
  });

  it("rejects a tampered payload (role escalation)", () => {
    const token = _sign(payload());
    const [, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...payload(), role: "admin" })).toString("base64url");
    expect(_verify(`${forged}.${sig}`)).toBeNull();
  });

  it("rejects expired, malformed and garbage tokens", () => {
    expect(_verify(_sign(payload(Math.floor(Date.now() / 1000) - 1)))).toBeNull();
    expect(_verify("no-dot-here")).toBeNull();
    expect(_verify("abc.def")).toBeNull();
  });
});

describe("RateLimiter", () => {
  it("allows maxTokens attempts then blocks until refill", () => {
    const limiter = new RateLimiter({ maxTokens: 2, refillIntervalMs: 1000 });
    expect(limiter.check("k", 0)).toBe(true);
    expect(limiter.check("k", 1)).toBe(true);
    expect(limiter.check("k", 2)).toBe(false);
    expect(limiter.remaining("k", 3)).toBe(0);
    expect(limiter.check("k", 1001)).toBe(true);
  });

  it("tracks keys independently and can reset", () => {
    const limiter = new RateLimiter({ maxTokens: 1 });
    expect(limiter.check("a", 0)).toBe(true);
    expect(limiter.check("b", 0)).toBe(true);
    expect(limiter.check("a", 1)).toBe(false);
    limiter.reset("a");
    expect(limiter.remaining("a")).toBe(1);
    limiter.clear();
    expect(limiter.check("b", 2)).toBe(true);
  });
});

describe("password hashing", () => {
  it("verifies the right secret and rejects the wrong one", async () => {
    const { hash, salt } = await hashSecret("1234");
    expect(await verifySecret("1234", hash, salt)).toBe(true);
    expect(await verifySecret("4321", hash, salt)).toBe(false);
  });

  it("uses a fresh salt per hash", async () => {
    const a = await hashSecret("1234");
    const b = await hashSecret("1234");
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });
});

describe("formatting", () => {
  it("formats paise as Indian rupees with lakh grouping", () => {
    expect(formatINR(12_500_000)).toBe("₹1,25,000.00");
    expect(formatINR(80_000)).toBe("₹800.00");
  });

  it("formats durations", () => {
    expect(formatDuration(370)).toBe("6h 10m");
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(120)).toBe("2h");
  });
});
