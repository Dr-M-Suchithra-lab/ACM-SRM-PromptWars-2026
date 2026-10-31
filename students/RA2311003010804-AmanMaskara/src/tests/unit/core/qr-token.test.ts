import { describe, expect, it } from "vitest";
import { getWindow, signQRToken, verifyQRToken } from "@/core/qr-token";

const SECRET = "test-secret-0123456789abcdef";
const T0 = new Date("2026-10-05T08:00:00+05:30");
const at = (seconds: number) => new Date(T0.getTime() + seconds * 1000);

describe("QR tokens", () => {
  it("verifies a fresh token and returns the site", () => {
    const token = signQRToken("site1", T0, SECRET);
    expect(verifyQRToken(token, T0, SECRET)).toEqual({ valid: true, siteId: "site1" });
  });

  it("accepts the adjacent window (clock skew) but not older", () => {
    const token = signQRToken("site1", T0, SECRET);
    expect(verifyQRToken(token, at(30), SECRET).valid).toBe(true);
    expect(verifyQRToken(token, at(-30), SECRET).valid).toBe(true);
    expect(verifyQRToken(token, at(90), SECRET)).toMatchObject({ valid: false, reason: "expired" });
  });

  it("rejects a tampered site id or a wrong secret", () => {
    const token = signQRToken("site1", T0, SECRET);
    const raw = Buffer.from(token, "base64url").toString().replace("site1", "site2");
    expect(verifyQRToken(Buffer.from(raw).toString("base64url"), T0, SECRET).reason).toBe("tampered");
    expect(verifyQRToken(token, T0, "other-secret").reason).toBe("tampered");
  });

  it("rejects malformed tokens", () => {
    expect(verifyQRToken(Buffer.from("just-text").toString("base64url"), T0, SECRET).reason).toBe("malformed_token");
    expect(verifyQRToken(Buffer.from("site1|abc|deadbeef").toString("base64url"), T0, SECRET).reason).toBe(
      "invalid_window",
    );
  });

  it("accepts an offline scan up to 12h later using the scan time", () => {
    const token = signQRToken("site1", T0, SECRET);
    const result = verifyQRToken(token, at(6 * 3600), SECRET, { offlineScannedAt: T0 });
    expect(result).toEqual({ valid: true, siteId: "site1" });
  });

  it("rejects offline scans older than 12h or claimed in the future", () => {
    const token = signQRToken("site1", T0, SECRET);
    expect(verifyQRToken(token, at(13 * 3600), SECRET, { offlineScannedAt: T0 }).reason).toBe("offline_too_old");
    const future = signQRToken("site1", at(3600), SECRET);
    expect(verifyQRToken(future, T0, SECRET, { offlineScannedAt: at(3600) }).reason).toBe("scanned_in_future");
  });

  it("rejects an offline scan whose token does not match the scan time", () => {
    const token = signQRToken("site1", T0, SECRET);
    expect(verifyQRToken(token, at(4 * 3600), SECRET, { offlineScannedAt: at(3600) }).reason).toBe("expired");
  });

  it("supports a custom window size", () => {
    expect(getWindow(at(59), 60)).toBe(getWindow(T0, 60));
    const token = signQRToken("site1", T0, SECRET, 60);
    expect(verifyQRToken(token, at(60), SECRET, { windowSizeSeconds: 60 }).valid).toBe(true);
  });
});
