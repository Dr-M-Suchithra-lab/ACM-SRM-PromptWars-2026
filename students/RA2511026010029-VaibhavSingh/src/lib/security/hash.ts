/**
 * FairShift Hisaab - Cryptographic Password & PIN Hashing
 * Implements salted PBKDF2 with SHA-256 via the native Web Crypto API.
 * Zero external dependencies. Safe across Edge, Node.js, and Browser.
 */

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH_BYTES = 32;

/**
 * Converts ArrayBuffer to hexadecimal string
 */
function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Converts hexadecimal string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Constant-time comparison between two strings to prevent timing attacks
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Hashes a plaintext passcode or password using PBKDF2-SHA256 and a random 16-byte salt
 */
export async function hashPassword(
  password: string,
  providedSaltHex?: string
): Promise<{ hash: string; salt: string }> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  let saltBytes: Uint8Array;
  if (providedSaltHex) {
    saltBytes = hexToBytes(providedSaltHex);
  } else {
    saltBytes = new Uint8Array(16);
    crypto.getRandomValues(saltBytes);
  }

  // Create clean ArrayBuffer for TypeScript BufferSource compatibility
  const saltBuffer = new ArrayBuffer(saltBytes.length);
  new Uint8Array(saltBuffer).set(saltBytes);

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    KEY_LENGTH_BYTES * 8
  );

  return {
    hash: bufferToHex(derivedBits),
    salt: bufferToHex(saltBuffer),
  };
}

/**
 * Verifies a plaintext password against a stored PBKDF2 hash and salt
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
  saltHex: string
): Promise<boolean> {
  try {
    const { hash: computedHash } = await hashPassword(password, saltHex);
    return timingSafeEqual(computedHash, storedHash);
  } catch (err) {
    return false;
  }
}
