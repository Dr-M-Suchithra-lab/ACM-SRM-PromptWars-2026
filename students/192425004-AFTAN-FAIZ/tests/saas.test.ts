import { afterEach, describe, expect, it, vi } from "vitest";
import {
  businessInput,
  employeeInput,
  passwordIssues,
  safeAuthNext,
} from "../shared/saas";
import { zonedDateTimeToIso } from "../shared/timezone";
import { applicationOrigin, digest, sendInvitation } from "../server/saas";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("SaaS security boundaries", () => {
  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/invite?next=https://evil.example",
    "/app/home#external",
  ])("rejects untrusted redirect %s", (v) =>
    expect(safeAuthNext(v)).toBe("/app/home"),
  );
  it.each(["/invite", "/onboarding", "/reset-password"])(
    "keeps authorized callback %s",
    (v) => expect(safeAuthNext(v)).toBe(v),
  );
  it("requires a long bounded password", () => {
    expect(passwordIssues("short")).toContain("12");
    expect(passwordIssues("long unique passphrase")).toBe("");
    expect(passwordIssues("a".repeat(129))).not.toBe("");
  });
  it("rejects untrusted origins, paths, credentials and nonlocal HTTP", () => {
    for (const origin of [
      "http://evil.example",
      "https://user:pass@example.test",
      "https://example.test/path",
      "https://example.test/",
    ]) {
      vi.stubEnv("APP_ORIGIN", origin);
      expect(applicationOrigin).toThrow();
    }
    vi.stubEnv("APP_ORIGIN", "https://nyaveris-ai.vercel.app");
    expect(applicationOrigin()).toBe("https://nyaveris-ai.vercel.app");
  });
  it("hashes invitation tokens deterministically without storing the input", () => {
    const token = "a".repeat(64);
    expect(digest(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(digest(token)).not.toBe(token);
    expect(digest(token)).not.toBe(digest("b".repeat(64)));
  });
  it("does not pretend email was sent without a provider", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect(
      await sendInvitation(
        "synthetic@example.test",
        "https://example.test/invite#token=synthetic",
      ),
    ).toBe("not_configured");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([true, false])(
    "distinguishes provider acceptance from failure (%s)",
    async (ok) => {
      vi.stubEnv("RESEND_API_KEY", "synthetic-test-value");
      vi.stubEnv("INVITATION_FROM_EMAIL", "synthetic@example.test");
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok }));
      expect(
        await sendInvitation(
          "worker@example.test",
          "https://example.test/invite#token=synthetic",
        ),
      ).toBe(ok ? "provider_accepted" : "failed");
    },
  );
  it("handles provider timeouts without leaking diagnostics", async () => {
    vi.stubEnv("RESEND_API_KEY", "synthetic");
    vi.stubEnv("INVITATION_FROM_EMAIL", "synthetic@example.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(Error("private provider diagnostic")),
    );
    expect(
      await sendInvitation(
        "worker@example.test",
        "https://example.test/invite",
      ),
    ).toBe("failed");
  });
  it("identifies the business, intended recipient and acceptance rules in the invitation", async () => {
    vi.stubEnv("RESEND_API_KEY", "synthetic-test-value");
    vi.stubEnv("INVITATION_FROM_EMAIL", "sender@example.test");
    const fetcher = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetcher);
    const link = "https://example.test/invite#token=synthetic";
    expect(
      await sendInvitation("worker@example.test", link, "Synthetic Clinic"),
    ).toBe("provider_accepted");
    const message = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(message.to).toEqual(["worker@example.test"]);
    for (const detail of [
      "Synthetic Clinic",
      "worker@example.test",
      "seven days",
      "single-use",
      link,
    ])
      expect(message.text).toContain(detail);
    expect(message.text).toContain("Create an account or sign in");
  });
  it("rejects privilege fields and fractional or negative employee money", () => {
    const e = {
      name: "Synthetic Worker",
      email: "worker@example.test",
      employee_code: "T1",
      employment_type: "contract",
      start_date: "2026-10-31",
      status: "active",
      rate_paise: 10000,
      pay_basis: "hourly",
    };
    expect(employeeInput.safeParse(e).success).toBe(true);
    for (const patch of [
      { role: "admin" },
      { user_id: crypto.randomUUID() },
      { rate_paise: 1.5 },
      { rate_paise: -1 },
    ])
      expect(employeeInput.safeParse({ ...e, ...patch }).success).toBe(false);
  });
  it("rejects arbitrary currency and duplicate working days", () => {
    const b = {
      request_id: crypto.randomUUID(),
      name: "Synthetic",
      industry: "other",
      email: "owner@example.test",
      location: "Test site",
      country: "India",
      state: "Test",
      city: "Test",
      size: 1,
      working_days: [1, 2],
      currency: "INR",
      policy: {
        hourly_paise: 10000,
        regular_minutes: 480,
        overtime_bps: 15000,
        min_rest_minutes: 660,
        max_shift_minutes: 720,
        max_consecutive_days: 6,
        timezone: "Asia/Kolkata",
      },
    };
    expect(businessInput.safeParse(b).success).toBe(true);
    expect(businessInput.safeParse({ ...b, currency: "USD" }).success).toBe(
      false,
    );
    expect(
      businessInput.safeParse({ ...b, working_days: [1, 1] }).success,
    ).toBe(false);
    expect(businessInput.safeParse({ ...b, role: "admin" }).success).toBe(
      false,
    );
  });
});
describe("organization time zone input", () => {
  it("uses organization offsets including quarter hours", () => {
    expect(zonedDateTimeToIso("2026-11-01T09:00", "Asia/Kolkata")).toBe(
      "2026-11-01T03:30:00.000Z",
    );
    expect(zonedDateTimeToIso("2026-11-01T09:00", "Asia/Kathmandu")).toBe(
      "2026-11-01T03:15:00.000Z",
    );
  });
  it("rejects nonexistent and ambiguous DST minutes", () => {
    expect(() =>
      zonedDateTimeToIso("2026-03-08T02:30", "America/New_York"),
    ).toThrow();
    expect(() =>
      zonedDateTimeToIso("2026-11-01T01:30", "America/New_York"),
    ).toThrow();
  });
  it("rejects impossible dates", () =>
    expect(() => zonedDateTimeToIso("2026-02-30T09:00", "UTC")).toThrow());
});
