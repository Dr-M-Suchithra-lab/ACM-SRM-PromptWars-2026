// ─── Signed, expiring share tokens (skill passport, work certificate) ─
// token = base64url(JSON claims) "." HMAC-SHA256(secret, kind + "." + payload)
// The kind is bound into the MAC, so a passport token can never verify as a certificate.

import { createHmac, timingSafeEqual } from "node:crypto";

export interface TokenClaims {
  /** What the token proves, e.g. 'passport' or 'certificate' */
  kind: string;
  /** Subject id (worker or certificate) */
  sub: string;
  /** Issued at, unix seconds */
  iat: number;
  /** Expires at, unix seconds; absent = no expiry */
  exp?: number;
  /** Extra non-secret claims, e.g. which passport sections are shared */
  data?: Record<string, string | number | boolean>;
}

export type VerifyResult =
  { ok: true; claims: TokenClaims } | { ok: false; reason: "malformed" | "tampered" | "expired" };

const mac = (secret: string, kind: string, payload: string): string =>
  createHmac("sha256", secret).update(`${kind}.${payload}`).digest("base64url");

export function signToken(claims: TokenClaims, secret: string): string {
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${payload}.${mac(secret, claims.kind, payload)}`;
}

function parseClaims(payload: string): TokenClaims | null {
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<TokenClaims>;
    const valid =
      typeof value.kind === "string" &&
      typeof value.sub === "string" &&
      typeof value.iat === "number" &&
      (value.exp === undefined || typeof value.exp === "number");
    return valid ? (value as TokenClaims) : null;
  } catch {
    return null;
  }
}

/** Constant-time check of the signature, then the kind, then the expiry. */
export function verifyToken(token: string, secret: string, kind: string, now: Date): VerifyResult {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return { ok: false, reason: "malformed" };

  const expected = Buffer.from(mac(secret, kind, payload));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, reason: "tampered" };

  const claims = parseClaims(payload);
  if (!claims || claims.kind !== kind) return { ok: false, reason: "malformed" };
  if (claims.exp !== undefined && claims.exp * 1000 < now.getTime()) return { ok: false, reason: "expired" };
  return { ok: true, claims };
}

export const toUnixSeconds = (date: Date): number => Math.floor(date.getTime() / 1000);
