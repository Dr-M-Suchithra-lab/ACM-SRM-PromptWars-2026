import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

export interface SessionPayload {
  uid: string;
  role: "worker" | "admin";
  orgId: string;
  siteId?: string;
  exp: number; // Unix timestamp in seconds
}

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

let devSecretWarned = false;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET environment variable is required in production");
  }

  if (!devSecretWarned) {
    console.warn("[FairShift] SESSION_SECRET not set — using fixed dev secret. Do NOT use in production.");
    devSecretWarned = true;
  }
  return "fairshift-dev-secret-do-not-use-in-production-1234567890";
}

function sign(payload: SessionPayload): string {
  const secret = getSecret();
  const data = JSON.stringify(payload);
  const encoded = Buffer.from(data).toString("base64url");
  const sig = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

function verify(token: string): SessionPayload | null {
  const secret = getSecret();
  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return null;

  const encoded = token.substring(0, dotIndex);
  const sig = token.substring(dotIndex + 1);

  const expectedSig = createHmac("sha256", secret).update(encoded).digest("base64url");

  // Constant-time comparison
  const sigBuf = Buffer.from(sig, "base64url");
  const expectedBuf = Buffer.from(expectedSig, "base64url");

  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const data = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));

    // Check expiry
    if (typeof data.exp !== "number" || data.exp < Date.now() / 1000) {
      return null;
    }

    return data as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(payload: Omit<SessionPayload, "exp">): Promise<void> {
  const exp = Math.floor((Date.now() + FIVE_DAYS_MS) / 1000);
  const fullPayload: SessionPayload = { ...payload, exp };
  const token = sign(fullPayload);

  const cookieStore = await cookies();
  cookieStore.set("fs_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(exp * 1000),
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("fs_session")?.value;
  if (!token) return null;
  return verify(token);
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("fs_session");
}

// Export for testing
export { sign as _sign, verify as _verify };
