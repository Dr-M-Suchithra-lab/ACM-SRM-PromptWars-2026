import "server-only";
import { signToken, toUnixSeconds, verifyToken, type VerifyResult } from "@/core/signed-token";
import type { PassportShare } from "@/core/work-history";

/** A shared passport QR stays valid for 30 days; the worker can make a fresh one any time. */
export const PASSPORT_TTL_DAYS = 30;
const DAY_S = 24 * 60 * 60;

function secret(): string {
  const value = process.env.PASSPORT_SECRET ?? process.env.SESSION_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production" && process.env.DEMO_MODE !== "true") {
    throw new Error("PASSPORT_SECRET environment variable is required in production");
  }
  return "fairshift-dev-passport-secret";
}

type Failure = Extract<VerifyResult, { ok: false }>;

export interface PassportClaims {
  workerId: string;
  share: PassportShare;
  issuedAt: Date;
  expiresAt: Date;
}

export function passportToken(workerId: string, share: PassportShare, now: Date): string {
  const iat = toUnixSeconds(now);
  return signToken(
    {
      kind: "passport",
      sub: workerId,
      iat,
      exp: iat + PASSPORT_TTL_DAYS * DAY_S,
      data: { skills: share.skills, history: share.history, hours: share.hours },
    },
    secret(),
  );
}

export function readPassportToken(token: string, now: Date): ({ ok: true } & PassportClaims) | Failure {
  const result = verifyToken(token, secret(), "passport", now);
  if (!result.ok) return result;
  const { sub, iat, exp, data } = result.claims;
  return {
    ok: true,
    workerId: sub,
    share: { skills: data?.skills === true, history: data?.history === true, hours: data?.hours === true },
    issuedAt: new Date(iat * 1000),
    expiresAt: new Date((exp ?? iat) * 1000),
  };
}

/** Work certificates do not expire: they certify days already worked. */
export function certificateToken(certificateId: string, issuedAt: Date): string {
  return signToken({ kind: "certificate", sub: certificateId, iat: toUnixSeconds(issuedAt) }, secret());
}

export function readCertificateToken(token: string, now: Date): { ok: true; certificateId: string } | Failure {
  const result = verifyToken(token, secret(), "certificate", now);
  return result.ok ? { ok: true, certificateId: result.claims.sub } : result;
}
