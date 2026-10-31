import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getRepos } from "@/server/repos";
import { resetMemoryStore } from "@/server/repos/memory";
import { _sign, createSession, deleteSession, getSession, type SessionPayload } from "@/server/session";
import { requireRole } from "@/server/dal";
import { rememberReport, trackedReports } from "@/server/hazard-tracking";
import { certificateToken, passportToken, readCertificateToken, readPassportToken } from "@/server/passport";
import { clientIp, isSameOrigin, tooLarge } from "@/server/http";
import { currentOrigin } from "@/server/origin";
import { isDemoMode } from "@/server/config";
import { feedbackHmacSecret, qrSecretFor, secretForSiteId } from "@/server/secrets";
import { JpegDataUrl, MAX_PHOTO_CHARS, Note } from "@/server/validation";

// A request-scoped cookie jar and header bag standing in for next/headers.
const { jar, requestHeaders } = vi.hoisted(() => ({
  jar: new Map<string, { value: string; options?: Record<string, unknown> }>(),
  requestHeaders: new Headers(),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)!.value } : undefined),
    set: (name: string, value: string, options?: Record<string, unknown>) => jar.set(name, { value, options }),
    delete: (name: string) => jar.delete(name),
  }),
  headers: async () => requestHeaders,
}));
// redirect() never returns in Next; throwing keeps that contract observable.
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

const NOW = new Date("2026-10-31T06:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const share = { skills: true, history: false, hours: true };

beforeEach(() => {
  jar.clear();
  for (const key of [...requestHeaders.keys()]) requestHeaders.delete(key);
  resetMemoryStore();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

/** Production without any secret configured, and not a demo deployment. */
function productionWithoutSecrets() {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("DEMO_MODE", "");
  for (const name of ["SESSION_SECRET", "PASSPORT_SECRET", "FEEDBACK_HMAC_SECRET"]) vi.stubEnv(name, "");
}

describe("session cookie", () => {
  const user = { uid: "w1001", role: "worker", orgId: "org1", siteId: "site1" } as const;

  it("is httpOnly, SameSite=Lax, site-wide and expires in five days", async () => {
    await createSession(user);
    const { options } = jar.get("fs_session")!;
    expect(options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/", secure: false });
    const days = ((options!.expires as Date).getTime() - Date.now()) / DAY_MS;
    expect(days).toBeGreaterThan(4.99);
    expect(days).toBeLessThanOrEqual(5);
  });

  it("is Secure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "a-production-secret-0123456789abcdef");
    await createSession(user);
    expect(jar.get("fs_session")!.options).toMatchObject({ secure: true });
  });

  it("round-trips, and is gone after logout", async () => {
    await createSession(user);
    expect(await getSession()).toMatchObject(user);
    await deleteSession();
    expect(await getSession()).toBeNull();
  });

  it("rejects a cookie signed with another secret", async () => {
    vi.stubEnv("SESSION_SECRET", "attacker-chosen-secret-0123456789");
    const forged = _sign({ ...user, role: "admin", exp: Math.floor(Date.now() / 1000) + 3600 } as SessionPayload);
    vi.unstubAllEnvs();
    jar.set("fs_session", { value: forged });
    expect(await getSession()).toBeNull();
  });

  it("refuses to sign anything in production without SESSION_SECRET", async () => {
    productionWithoutSecrets();
    await expect(createSession(user)).rejects.toThrow(/SESSION_SECRET/);
  });
});

describe("requireRole", () => {
  const signIn = (role: "worker" | "admin") =>
    createSession({ uid: role === "worker" ? "w1001" : "admin1", role, orgId: "org1" });

  it("sends visitors without a session to login", async () => {
    await expect(requireRole("worker")).rejects.toThrow("REDIRECT /login");
    jar.set("fs_session", { value: "garbage.token" });
    await expect(requireRole("admin")).rejects.toThrow("REDIRECT /login");
  });

  it("sends the wrong role to its own home, never into the other app", async () => {
    await signIn("worker");
    await expect(requireRole("admin")).rejects.toThrow("REDIRECT /w");
    jar.clear();
    await signIn("admin");
    await expect(requireRole("worker")).rejects.toThrow("REDIRECT /a");
  });

  it("returns the session for the right role", async () => {
    await signIn("admin");
    await expect(requireRole("admin")).resolves.toMatchObject({ uid: "admin1", role: "admin" });
  });
});

describe("anonymous report tracking cookie", () => {
  const report = (n: number) => ({
    hazardId: `haz-${String(n).padStart(2, "0")}`,
    ref: `FS-${String(n).padStart(6, "0")}`,
  });

  it("remembers reports newest first, without duplicates, only under /w", async () => {
    await rememberReport(report(1));
    await rememberReport(report(2));
    await rememberReport(report(1));
    expect(await trackedReports()).toEqual([report(1), report(2)]);
    expect(jar.get("fs_tracked")!.options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/w" });
  });

  it("keeps at most 20 reports", async () => {
    for (let n = 1; n <= 25; n++) await rememberReport(report(n));
    const tracked = await trackedReports();
    expect(tracked).toHaveLength(20);
    expect(tracked[0]).toEqual(report(25));
  });

  it("ignores tampered or injected entries", async () => {
    jar.set("fs_tracked", { value: "haz-01~FS-000001,haz-02~fs-lower,../etc~FS-000003,haz-03~FS-000003;x=1,<script>" });
    expect(await trackedReports()).toEqual([report(1)]);
  });
});

describe("signed share links", () => {
  it("round-trips a passport link with exactly the sections the worker chose", () => {
    const result = readPassportToken(passportToken("w1001", share, NOW), NOW);
    expect(result).toMatchObject({ ok: true, workerId: "w1001", share });
    if (result.ok) expect(result.expiresAt.getTime() - result.issuedAt.getTime()).toBe(30 * DAY_MS);
  });

  it("expires a passport link after 30 days", () => {
    const token = passportToken("w1001", share, NOW);
    expect(readPassportToken(token, new Date(NOW.getTime() + 31 * DAY_MS))).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects an edited passport link (more sections, another worker)", () => {
    const [payload, signature] = passportToken("w1001", share, NOW).split(".");
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    const edited = Buffer.from(JSON.stringify({ ...claims, sub: "w1002", data: { ...claims.data, history: true } }));
    expect(readPassportToken(`${edited.toString("base64url")}.${signature}`, NOW)).toMatchObject({ ok: false });
  });

  it("never accepts one kind of link as another", () => {
    const certificate = certificateToken("cert-1", NOW);
    expect(readCertificateToken(certificate, new Date(NOW.getTime() + 3650 * DAY_MS))).toEqual({
      ok: true,
      certificateId: "cert-1",
    });
    expect(readPassportToken(certificate, NOW)).toMatchObject({ ok: false });
    expect(readCertificateToken(passportToken("w1001", share, NOW), NOW)).toMatchObject({ ok: false });
  });

  it("refuses to sign links in production without a secret", () => {
    productionWithoutSecrets();
    expect(() => certificateToken("cert-1", NOW)).toThrow(/PASSPORT_SECRET/);
  });
});

describe("request checks", () => {
  const request = (headers: Record<string, string>) => new Request("https://fairshift.example/api/x", { headers });

  it("accepts same-origin and header-less requests, rejects cross-site and malformed origins", () => {
    expect(isSameOrigin(request({ host: "fairshift.example" }))).toBe(true);
    expect(isSameOrigin(request({ host: "fairshift.example", origin: "https://fairshift.example" }))).toBe(true);
    expect(isSameOrigin(request({ host: "fairshift.example", origin: "https://evil.example" }))).toBe(false);
    expect(isSameOrigin(request({ host: "fairshift.example", origin: "null" }))).toBe(false);
    expect(
      isSameOrigin(
        request({
          host: "internal:8080",
          "x-forwarded-host": "fairshift.example",
          origin: "https://fairshift.example",
        }),
      ),
    ).toBe(true);
  });

  it("flags bodies declared larger than the limit", () => {
    expect(tooLarge(request({ "content-length": "1025" }), 1024)).toBe(true);
    expect(tooLarge(request({ "content-length": "1024" }), 1024)).toBe(false);
    expect(tooLarge(request({}), 1024)).toBe(false);
  });

  it("uses the first forwarded client address", () => {
    expect(clientIp(request({ "x-forwarded-for": " 203.0.113.7 , 10.0.0.1" }))).toBe("203.0.113.7");
    expect(clientIp(request({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(request({}))).toBe("unknown");
  });

  it("builds absolute share links from the proxy's public host", async () => {
    expect(await currentOrigin()).toBe("http://localhost:3000");
    requestHeaders.set("x-forwarded-host", "fairshift.example");
    expect(await currentOrigin()).toBe("https://fairshift.example");
    requestHeaders.set("x-forwarded-proto", "http");
    expect(await currentOrigin()).toBe("http://fairshift.example");
  });
});

describe("configuration and secrets", () => {
  it("shows demo logins in development and only when asked elsewhere", () => {
    vi.stubEnv("DEMO_MODE", undefined as unknown as string);
    expect(isDemoMode()).toBe(true);
    vi.stubEnv("NODE_ENV", "production");
    expect(isDemoMode()).toBe(false);
    vi.stubEnv("DEMO_MODE", "true");
    expect(isDemoMode()).toBe(true);
    vi.stubEnv("DEMO_MODE", "false");
    expect(isDemoMode()).toBe(false);
  });

  it("gives every site its own QR secret", async () => {
    const site = (await getRepos().sites.getById("site1"))!;
    expect(qrSecretFor(site)).toBe(site.qrSecret);
    vi.stubEnv("QR_SIGNING_SECRET", "global");
    expect(qrSecretFor(site)).toBe("global:site1");
    expect(await secretForSiteId("site1")).toBe("global:site1");
    expect(await secretForSiteId("no-such-site")).toBeNull();
  });

  it("requires the feedback secret in production", () => {
    expect(feedbackHmacSecret()).toBeTruthy();
    productionWithoutSecrets();
    expect(() => feedbackHmacSecret()).toThrow(/FEEDBACK_HMAC_SECRET/);
  });
});

describe("input validation", () => {
  it("accepts only JPEG data URLs within the size limit", () => {
    expect(JpegDataUrl.safeParse("data:image/jpeg;base64,/9j/4AAQ").success).toBe(true);
    expect(JpegDataUrl.safeParse("data:image/png;base64,iVBORw0").success).toBe(false);
    expect(JpegDataUrl.safeParse("data:text/html;base64,PHNjcmlwdD4=").success).toBe(false);
    expect(JpegDataUrl.safeParse('data:image/jpeg;base64,AA"onerror="x').success).toBe(false);
    expect(JpegDataUrl.safeParse(`data:image/jpeg;base64,${"A".repeat(MAX_PHOTO_CHARS)}`).success).toBe(false);
  });

  it("trims notes and caps them at 500 characters", () => {
    expect(Note.parse("  fixed  ")).toBe("fixed");
    expect(Note.safeParse("x".repeat(501)).success).toBe(false);
  });
});
