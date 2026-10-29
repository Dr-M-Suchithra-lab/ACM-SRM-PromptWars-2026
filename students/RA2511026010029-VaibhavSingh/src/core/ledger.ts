/**
 * Pure TypeScript SHA-256 implementation for tamper-evident shift ledger.
 * Works synchronously in any environment (Node, Browser, Edge, Tests).
 */
function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let lengthProperty = 'length';
  let i = 0, j = 0;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty as 'length'] * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  for (i = 0; i < ascii[lengthProperty as 'length']; i++) {
    j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }

  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  const w: number[] = new Array(64);

  for (i = 0; i < words.length; i += 16) {
    let [a, b, c, d, e, f, g, h] = hash;

    for (j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[i + j] | 0;
      } else {
        const gamma0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const gamma1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = ((w[j - 16] + gamma0) | 0) + ((w[j - 7] + gamma1) | 0) | 0;
      }

      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (((((h + s1) | 0) + ch) | 0) + k[j] + w[j]) | 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }

  return result;
}

export interface LedgerEntry {
  index: number;
  timestamp: string;
  workerId: string;
  siteId: string;
  shiftHours: number;
  hourlyRate: number;
  totalEarnedRupees: number;
  workerConfirmation: boolean;
  notes?: string;
  previousHash: string;
  hash: string;
}

export const GENESIS_PREVIOUS_HASH = '0'.repeat(64);

/**
 * Calculates cryptographic hash of an entry's immutable data and previous link.
 */
export function calculateEntryHash(
  index: number,
  timestamp: string,
  workerId: string,
  siteId: string,
  shiftHours: number,
  hourlyRate: number,
  totalEarnedRupees: number,
  workerConfirmation: boolean,
  notes: string | undefined,
  previousHash: string
): string {
  const payload = JSON.stringify({
    index,
    timestamp,
    workerId,
    siteId,
    shiftHours,
    hourlyRate,
    totalEarnedRupees,
    workerConfirmation,
    notes: notes || '',
    previousHash,
  });
  return sha256(payload);
}

/**
 * Creates a new block in the tamper-evident shift ledger.
 * Note: Tamper-evident, never tamper-proof. Any post-facto edit breaks the hash chain.
 */
export function createLedgerEntry(
  params: Omit<LedgerEntry, 'index' | 'previousHash' | 'hash'>,
  previousEntry?: LedgerEntry
): LedgerEntry {
  const index = previousEntry ? previousEntry.index + 1 : 0;
  const previousHash = previousEntry ? previousEntry.hash : GENESIS_PREVIOUS_HASH;

  const hash = calculateEntryHash(
    index,
    params.timestamp,
    params.workerId,
    params.siteId,
    params.shiftHours,
    params.hourlyRate,
    params.totalEarnedRupees,
    params.workerConfirmation,
    params.notes,
    previousHash
  );

  return {
    ...params,
    index,
    previousHash,
    hash,
  };
}

export interface VerificationResult {
  isValid: boolean;
  isTampered: boolean;
  tamperedIndex?: number;
  reason?: string;
}

/**
 * Verifies the integrity of a hash-chained shift ledger.
 * Returns isValid: true if all hashes match, or indicates the first tampered entry.
 */
export function verifyChain(chain: LedgerEntry[]): VerificationResult {
  if (!chain || chain.length === 0) {
    return { isValid: true, isTampered: false };
  }

  for (let i = 0; i < chain.length; i++) {
    const current = chain[i];

    // Check index sequencing
    if (current.index !== i) {
      return {
        isValid: false,
        isTampered: true,
        tamperedIndex: i,
        reason: `Broken sequence at position ${i}. Expected index ${i}, got ${current.index}.`,
      };
    }

    // Check previous hash link
    const expectedPreviousHash = i === 0 ? GENESIS_PREVIOUS_HASH : chain[i - 1].hash;
    if (current.previousHash !== expectedPreviousHash) {
      return {
        isValid: false,
        isTampered: true,
        tamperedIndex: i,
        reason: `Tamper detected: previous hash mismatch at block ${i}.`,
      };
    }

    // Recompute current hash
    const recalculated = calculateEntryHash(
      current.index,
      current.timestamp,
      current.workerId,
      current.siteId,
      current.shiftHours,
      current.hourlyRate,
      current.totalEarnedRupees,
      current.workerConfirmation,
      current.notes,
      current.previousHash
    );

    if (recalculated !== current.hash) {
      return {
        isValid: false,
        isTampered: true,
        tamperedIndex: i,
        reason: `Tamper detected: content hash mismatch at block ${i}. Data was altered.`,
      };
    }
  }

  return {
    isValid: true,
    isTampered: false,
  };
}
