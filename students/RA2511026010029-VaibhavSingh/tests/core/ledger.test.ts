import { describe, it, expect } from 'vitest';
import {
  createLedgerEntry,
  verifyChain,
  LedgerEntry,
  GENESIS_PREVIOUS_HASH,
} from '@/core/ledger';

describe('Tamper-Evident Shift Ledger', () => {
  it('creates genesis block linked to 64 zero previous hash', () => {
    const entry0 = createLedgerEntry({
      timestamp: '2026-10-01T08:00:00Z',
      workerId: 'worker-sunita',
      siteId: 'srmist',
      shiftHours: 8,
      hourlyRate: 100,
      totalEarnedRupees: 800,
      workerConfirmation: true,
      notes: 'Morning shift',
    });

    expect(entry0.index).toBe(0);
    expect(entry0.previousHash).toBe(GENESIS_PREVIOUS_HASH);
    expect(entry0.hash).toHaveLength(64);
  });

  it('chains consecutive blocks and verifies valid chain', () => {
    const entry0 = createLedgerEntry({
      timestamp: '2026-10-01T08:00:00Z',
      workerId: 'worker-sunita',
      siteId: 'srmist',
      shiftHours: 8,
      hourlyRate: 100,
      totalEarnedRupees: 800,
      workerConfirmation: true,
    });

    const entry1 = createLedgerEntry(
      {
        timestamp: '2026-10-02T08:00:00Z',
        workerId: 'worker-sunita',
        siteId: 'srmist',
        shiftHours: 9,
        hourlyRate: 100,
        totalEarnedRupees: 1000,
        workerConfirmation: true,
      },
      entry0
    );

    const entry2 = createLedgerEntry(
      {
        timestamp: '2026-10-03T08:00:00Z',
        workerId: 'worker-sunita',
        siteId: 'srmist',
        shiftHours: 8,
        hourlyRate: 100,
        totalEarnedRupees: 800,
        workerConfirmation: true,
      },
      entry1
    );

    const chain: LedgerEntry[] = [entry0, entry1, entry2];
    const verification = verifyChain(chain);

    expect(verification.isValid).toBe(true);
    expect(verification.isTampered).toBe(false);
  });

  it('detects tampering when an adversary alters logged hours in block 1', () => {
    const entry0 = createLedgerEntry({
      timestamp: '2026-10-01T08:00:00Z',
      workerId: 'worker-sunita',
      siteId: 'srmist',
      shiftHours: 8,
      hourlyRate: 100,
      totalEarnedRupees: 800,
      workerConfirmation: true,
    });

    const entry1 = createLedgerEntry(
      {
        timestamp: '2026-10-02T08:00:00Z',
        workerId: 'worker-sunita',
        siteId: 'srmist',
        shiftHours: 10,
        hourlyRate: 100,
        totalEarnedRupees: 1200,
        workerConfirmation: true,
      },
      entry0
    );

    // Adversary attempts to stealthily edit shiftHours from 10 to 8 without re-signing
    const tamperedEntry1 = { ...entry1, shiftHours: 8, totalEarnedRupees: 800 };

    const tamperedChain: LedgerEntry[] = [entry0, tamperedEntry1];
    const verification = verifyChain(tamperedChain);

    expect(verification.isValid).toBe(false);
    expect(verification.isTampered).toBe(true);
    expect(verification.tamperedIndex).toBe(1);
    expect(verification.reason).toContain('Tamper detected: content hash mismatch');
  });

  it('detects broken previousHash link when a block is inserted or removed', () => {
    const entry0 = createLedgerEntry({
      timestamp: '2026-10-01T08:00:00Z',
      workerId: 'worker-sunita',
      siteId: 'srmist',
      shiftHours: 8,
      hourlyRate: 100,
      totalEarnedRupees: 800,
      workerConfirmation: true,
    });

    const entry1 = createLedgerEntry(
      {
        timestamp: '2026-10-02T08:00:00Z',
        workerId: 'worker-sunita',
        siteId: 'srmist',
        shiftHours: 8,
        hourlyRate: 100,
        totalEarnedRupees: 800,
        workerConfirmation: true,
      },
      entry0
    );

    // Tamper with previous hash
    const corruptEntry1 = { ...entry1, previousHash: 'abc12345' };
    const verification = verifyChain([entry0, corruptEntry1]);

    expect(verification.isValid).toBe(false);
    expect(verification.isTampered).toBe(true);
    expect(verification.reason).toContain('previous hash mismatch');
  });
});
