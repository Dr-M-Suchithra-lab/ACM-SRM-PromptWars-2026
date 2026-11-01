// ─── FairShift QR Token Signing & Verification ─────────────────────
// Token = base64url(siteId | window | HMAC-SHA256(secret, siteId|window))
// 30-second window default. Accepts current window ±1.
// Offline: accepts window matching offlineScannedAt, up to 12h old.

import { createHmac, timingSafeEqual as cryptoTimingSafeEqual } from "node:crypto";

const DEFAULT_WINDOW_SIZE = 30; // seconds
const OFFLINE_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours in ms
const SEPARATOR = "|";

/**
 * Get the time window number for a given timestamp.
 * Window = floor(unix_seconds / windowSizeSeconds)
 */
export function getWindow(now: Date, windowSizeSeconds?: number): number {
  const size = windowSizeSeconds ?? DEFAULT_WINDOW_SIZE;
  return Math.floor(now.getTime() / 1000 / size);
}

/**
 * Sign a QR token for a site at the given time.
 * Returns a base64url-encoded string containing siteId, window, and HMAC.
 */
export function signQRToken(siteId: string, now: Date, secret: string, windowSizeSeconds?: number): string {
  const w = getWindow(now, windowSizeSeconds);
  const payload = `${siteId}${SEPARATOR}${w}`;
  const mac = hmac(secret, payload);
  const raw = `${payload}${SEPARATOR}${mac}`;
  return toBase64Url(raw);
}

/**
 * Verify a QR token.
 *
 * - Accepts current window and ±1 adjacent windows.
 * - For offline scans: accepts the window matching offlineScannedAt,
 *   but only if offlineScannedAt is within 12 hours of `now`.
 */
export function verifyQRToken(
  token: string,
  now: Date,
  secret: string,
  opts?: { offlineScannedAt?: Date; windowSizeSeconds?: number },
): { valid: boolean; siteId: string | null; reason?: string } {
  const windowSize = opts?.windowSizeSeconds ?? DEFAULT_WINDOW_SIZE;

  let raw: string;
  try {
    raw = fromBase64Url(token);
  } catch {
    return { valid: false, siteId: null, reason: "invalid_encoding" };
  }

  const parts = raw.split(SEPARATOR);
  if (parts.length < 3) {
    return { valid: false, siteId: null, reason: "malformed_token" };
  }

  // The HMAC is the last part, window is second-to-last, everything else is siteId
  // Support siteIds that contain the separator (unlikely but safe)
  const mac = parts[parts.length - 1];
  const windowStr = parts[parts.length - 2];
  const siteId = parts.slice(0, parts.length - 2).join(SEPARATOR);

  const tokenWindow = parseInt(windowStr, 10);
  if (isNaN(tokenWindow)) {
    return { valid: false, siteId: null, reason: "invalid_window" };
  }

  // Verify HMAC
  const payload = `${siteId}${SEPARATOR}${tokenWindow}`;
  const expectedMac = hmac(secret, payload);
  if (!timingSafeEqual(mac, expectedMac)) {
    return { valid: false, siteId, reason: "tampered" };
  }

  // Check window validity
  const currentWindow = getWindow(now, windowSize);

  // Standard: accept ±1 window
  if (tokenWindow === currentWindow || tokenWindow === currentWindow - 1 || tokenWindow === currentWindow + 1) {
    return { valid: true, siteId };
  }

  // Offline grace: accept if token matches the offlineScannedAt window
  // and offlineScannedAt is within 12h of now
  if (opts?.offlineScannedAt) {
    const age = now.getTime() - opts.offlineScannedAt.getTime();
    if (age < -windowSize * 1000) {
      return { valid: false, siteId, reason: "scanned_in_future" };
    }
    if (age > OFFLINE_MAX_AGE_MS) {
      return { valid: false, siteId, reason: "offline_too_old" };
    }

    const offlineWindow = getWindow(opts.offlineScannedAt, windowSize);
    if (tokenWindow === offlineWindow || tokenWindow === offlineWindow - 1 || tokenWindow === offlineWindow + 1) {
      return { valid: true, siteId };
    }
  }

  return { valid: false, siteId, reason: "expired" };
}

/**
 * Read the site id from a token WITHOUT trusting it, so the caller can look up
 * that site's secret and then call verifyQRToken. Returns null if malformed.
 */
export function peekQRSiteId(token: string): string | null {
  try {
    const parts = fromBase64Url(token).split(SEPARATOR);
    return parts.length >= 3 ? parts.slice(0, -2).join(SEPARATOR) || null : null;
  } catch {
    return null;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function hmac(secret: string, data: string): string {
  return createHmac("sha256", secret).update(data).digest("hex");
}

function toBase64Url(str: string): string {
  return Buffer.from(str, "utf-8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(b64: string): string {
  let s = b64.replace(/-/g, "+").replace(/_/g, "/");
  // Add padding
  while (s.length % 4 !== 0) {
    s += "=";
  }
  return Buffer.from(s, "base64").toString("utf-8");
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return cryptoTimingSafeEqual(bufA, bufB);
}
