import { describe, it, expect } from 'vitest';
import { compareReceipt, recordReceiptEdit, WorkReceipt } from '@/core/receipt';

describe('Work Receipt Core Logic', () => {
  it('identifies exact MATCH when agreed, worked and paid align', () => {
    const agreed = { hours: 8, ratePerHour: 100, totalRupees: 800 };
    const worked = { hours: 8, ratePerHour: 100, totalRupees: 800 };
    const paid = { hours: 8, ratePerHour: 100, totalRupees: 800 };

    const result = compareReceipt(agreed, worked, paid);
    expect(result.status).toBe('MATCH');
    expect(result.hourDifference).toBe(0);
    expect(result.rupeeDifference).toBe(0);
  });

  it('detects NEEDS_REVIEW when worked hours exceed paid hours', () => {
    const agreed = { hours: 8, ratePerHour: 100, totalRupees: 800 };
    const worked = { hours: 10, ratePerHour: 100, totalRupees: 1000 };
    const paid = { hours: 8, ratePerHour: 100, totalRupees: 800 };

    const result = compareReceipt(agreed, worked, paid);
    expect(result.status).toBe('NEEDS_REVIEW');
    expect(result.hourDifference).toBe(2);
    expect(result.rupeeDifference).toBe(200);
    expect(result.explanation).toContain('Worked 2 hour(s) more than paid');
  });

  it('handles edge case of 0 hours worked and 0 hours paid', () => {
    const agreed = { hours: 8, ratePerHour: 100, totalRupees: 800 };
    const worked = { hours: 0, ratePerHour: 100, totalRupees: 0 };
    const paid = { hours: 0, ratePerHour: 100, totalRupees: 0 };

    const result = compareReceipt(agreed, worked, paid);
    expect(result.status).toBe('MATCH');
    expect(result.hourDifference).toBe(0);
  });

  it('maintains immutable edit history and previous versions on edit', () => {
    const initialReceipt: WorkReceipt = {
      id: 'rcpt-01',
      workerId: 'worker-sunita',
      shiftDate: '2026-10-20',
      agreed: { hours: 8, ratePerHour: 120, totalRupees: 960 },
      worked: { hours: 9, ratePerHour: 120, totalRupees: 1080 },
      paid: { hours: 8, ratePerHour: 120, totalRupees: 960 },
      status: 'NEEDS_REVIEW',
      hourDifference: 1,
      rupeeDifference: 120,
      explanation: 'Worked 1 hour(s) more than paid.',
      auditHistory: [],
    };

    const updated = recordReceiptEdit(
      initialReceipt,
      'paid',
      { hours: 9, ratePerHour: 120, totalRupees: 1080 },
      'thekedar-01',
      'Settled 1h overtime arrears in cash'
    );

    expect(updated.status).toBe('MATCH');
    expect(updated.auditHistory?.length).toBe(1);
    expect(updated.auditHistory?.[0].previous.hours).toBe(8);
    expect(updated.auditHistory?.[0].updated.hours).toBe(9);
    expect(updated.auditHistory?.[0].reason).toContain('overtime arrears');
  });
});
