import { describe, it, expect } from 'vitest';
import { evaluateEscrowGroup, ComplaintReport } from '@/core/escrow';

describe('Collective Escrow Vault Logic', () => {
  it('keeps vault LOCKED when fewer than 3 distinct workers report non-urgent issues', () => {
    const reports: ComplaintReport[] = [
      {
        id: 'c-1',
        workerId: 'worker-A',
        category: 'wage_theft',
        targetType: 'zone',
        targetId: 'Hostel Block A',
        timestamp: '2026-10-20T10:00:00Z',
        sanitizedSummary: 'Short payment on Sunday overtime',
      },
      {
        id: 'c-2',
        workerId: 'worker-B',
        category: 'wage_theft',
        targetType: 'zone',
        targetId: 'Hostel Block A',
        timestamp: '2026-10-20T11:00:00Z',
        sanitizedSummary: 'Overtime hours not logged on muster roll',
      },
    ];

    const result = evaluateEscrowGroup('Hostel Block A', reports);
    expect(result.status).toBe('LOCKED');
    expect(result.isUnlocked).toBe(false);
    // Differential privacy: count must be suppressed (0 or hidden) when under threshold
    expect(result.distinctWorkerCount).toBe(0);
    expect(result.publicCountDisplay).toContain('Protected');
    expect(result.reports).toHaveLength(0); // Withheld while locked
  });

  it('does NOT unlock if 3 reports are submitted by the same worker (must be distinct workers)', () => {
    const reports: ComplaintReport[] = [
      {
        id: 'c-1',
        workerId: 'worker-A',
        category: 'unsafe_equipment',
        targetType: 'zone',
        targetId: 'Tech Park Floor 4',
        timestamp: '2026-10-20T10:00:00Z',
        sanitizedSummary: 'Broken ladder',
      },
      {
        id: 'c-2',
        workerId: 'worker-A', // Same worker!
        category: 'unsafe_equipment',
        targetType: 'zone',
        targetId: 'Tech Park Floor 4',
        timestamp: '2026-10-20T11:00:00Z',
        sanitizedSummary: 'Still broken ladder',
      },
      {
        id: 'c-3',
        workerId: 'worker-A', // Same worker!
        category: 'unsafe_equipment',
        targetType: 'zone',
        targetId: 'Tech Park Floor 4',
        timestamp: '2026-10-20T12:00:00Z',
        sanitizedSummary: 'Nobody fixed the ladder',
      },
    ];

    const result = evaluateEscrowGroup('Tech Park Floor 4', reports);
    expect(result.status).toBe('LOCKED');
    expect(result.isUnlocked).toBe(false);
  });

  it('unlocks UNLOCKED_GROUP_ALERT when exactly 3 distinct workers report the same target', () => {
    const reports: ComplaintReport[] = [
      {
        id: 'c-1',
        workerId: 'worker-1',
        category: 'wage_theft',
        targetType: 'supervisor',
        targetId: 'supervisor-sharma',
        timestamp: '2026-10-20T10:00:00Z',
        sanitizedSummary: 'Cut ₹100 from daily wage',
      },
      {
        id: 'c-2',
        workerId: 'worker-2',
        category: 'wage_theft',
        targetType: 'supervisor',
        targetId: 'supervisor-sharma',
        timestamp: '2026-10-20T11:00:00Z',
        sanitizedSummary: 'Deducted ₹100 tea expense illegally',
      },
      {
        id: 'c-3',
        workerId: 'worker-3',
        category: 'wage_theft',
        targetType: 'supervisor',
        targetId: 'supervisor-sharma',
        timestamp: '2026-10-20T12:00:00Z',
        sanitizedSummary: 'Illegal deduction on wage slip',
      },
    ];

    const result = evaluateEscrowGroup('supervisor-sharma', reports);
    expect(result.status).toBe('UNLOCKED_GROUP_ALERT');
    expect(result.isUnlocked).toBe(true);
    expect(result.distinctWorkerCount).toBe(3);
    expect(result.publicCountDisplay).toContain('3 workers confirmed');
    expect(result.reports).toHaveLength(3);
  });

  it('bypasses escrow immediately for urgent categories (injury, harassment, life risk)', () => {
    const urgentReport: ComplaintReport = {
      id: 'c-urgent',
      workerId: 'worker-victim',
      category: 'harassment',
      targetType: 'supervisor',
      targetId: 'supervisor-bad',
      timestamp: '2026-10-20T10:00:00Z',
      sanitizedSummary: 'Threatened with termination if I speak to safety auditor',
    };

    const result = evaluateEscrowGroup('supervisor-bad', [urgentReport]);
    expect(result.status).toBe('URGENT_UNLOCKED');
    expect(result.isUnlocked).toBe(true);
    expect(result.isUrgentBypass).toBe(true);
    expect(result.publicCountDisplay).toContain('Urgent Escalation');
  });
});
