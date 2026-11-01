import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/*
 * Bank account numbers are encrypted before they are stored (AES-256-GCM) and decrypted only by
 * the checkout service, at the moment a payment is split to the worker. A leaked database or
 * backup holds no usable account number. The worker id is bound in as associated data, so a
 * ciphertext copied onto another worker's record does not decrypt.
 *
 * Stored form: "v1.<key id>.<iv>.<tag>.<ciphertext>" (base64url). The key id lets the key be
 * rotated: set the new key, keep the old one as BANK_ENCRYPTION_KEY_PREVIOUS until re-saved.
 */

const VERSION = "v1";
const DEV_KEY = "fairshift-dev-bank-encryption-key";

/** 32-byte AES key from any secret string (the variable holds a long random string). */
const deriveKey = (secret: string) => createHash("sha256").update(`fairshift-bank:${secret}`).digest();
/** Short public id of a key, so a ciphertext says which key sealed it. */
const keyId = (key: Buffer) => createHash("sha256").update(key).digest("base64url").slice(0, 8);

function currentSecret(): string {
  const value = process.env.BANK_ENCRYPTION_KEY;
  if (value) return value;
  if (process.env.NODE_ENV === "production" && process.env.DEMO_MODE !== "true") {
    throw new Error("BANK_ENCRYPTION_KEY environment variable is required in production");
  }
  return DEV_KEY;
}

function keys(): Buffer[] {
  const previous = process.env.BANK_ENCRYPTION_KEY_PREVIOUS;
  return [deriveKey(currentSecret()), ...(previous ? [deriveKey(previous)] : [])];
}

export function encryptAccount(account: string, workerId: string): string {
  const [key] = keys();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(workerId));
  const sealed = Buffer.concat([cipher.update(account, "utf8"), cipher.final()]);
  return [VERSION, keyId(key), iv, cipher.getAuthTag(), sealed]
    .map((part) => (typeof part === "string" ? part : part.toString("base64url")))
    .join(".");
}

/** The account number, or an error if the value was tampered with, moved or sealed by an unknown key. */
export function decryptAccount(stored: string, workerId: string): string {
  const [version, id, iv, tag, sealed] = stored.split(".");
  if (version !== VERSION || !id || !iv || !tag || !sealed) throw new Error("bank account: unreadable ciphertext");
  const key = keys().find((k) => keyId(k) === id);
  if (!key) throw new Error("bank account: sealed with an unknown key");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(workerId));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(sealed, "base64url")), decipher.final()]).toString("utf8");
}
