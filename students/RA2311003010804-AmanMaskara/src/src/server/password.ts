import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (secret: string, salt: Buffer, keylen: number) => Promise<Buffer>;

const KEY_LENGTH = 64;

/** Hash a PIN or password with scrypt and a random salt. */
export async function hashSecret(secret: string): Promise<{ hash: string; salt: string }> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(secret, salt, KEY_LENGTH);
  return { hash: derived.toString("hex"), salt: salt.toString("hex") };
}

/** Constant-time check of a PIN or password against a stored scrypt hash. */
export async function verifySecret(secret: string, hashHex: string, saltHex: string): Promise<boolean> {
  const expected = Buffer.from(hashHex, "hex");
  const derived = await scryptAsync(secret, Buffer.from(saltHex, "hex"), expected.length || KEY_LENGTH);
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
