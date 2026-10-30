import { describe, it, expect } from 'vitest';
import { checkFatigue, ShiftInterval } from '@/core/fatigue';

describe('Fatigue and Rest Violation Detection', () => {
  it('flags rest period under 10 hours with exact structural reason', () => {
    const shifts: ShiftInterval[] = [
      {
        startTime: '2026-10-10T14:00:00Z',
        endTime: '2026-10-10T22:00:00Z',
      },
      {
        startTime: '2026-10-11T06:00:00Z', // 8 hours rest
        endTime: '2026-10-11T14:00:00Z',
      },
    ];

    const result = checkFatigue(shifts, 10, 6);
    expect(result.hasFatigueRisk).toBe(true);
    expect(result.restHoursViolated).toBe(true);
    expect(result.lastRestHours).toBe(8);
    expect(result.reasons[0]).toContain('was 8.0 hours (statutory minimum is 10 hours)');
    // Non-pejorative check: must not contain words like lazy, tired, fatigued
    expect(result.reasons[0]).not.toMatch(/lazy|fatigued worker|unfit/i);
  });

  it('handles midnight crossing shifts correctly', () => {
    const shifts: ShiftInterval[] = [
      {
        // Night shift crossing midnight
        startTime: '2026-10-10T20:00:00Z',
        endTime: '2026-10-11T04:00:00Z',
      },
      {
        // Next shift starting at 16:00 same day (12 hours rest -> compliant)
        startTime: '2026-10-11T16:00:00Z',
        endTime: '2026-10-12T00:00:00Z',
      },
    ];

    const result = checkFatigue(shifts, 10, 6);
    expect(result.hasFatigueRisk).toBe(false);
    expect(result.restHoursViolated).toBe(false);
    expect(result.lastRestHours).toBe(12);
  });

  it('flags when worker exceeds 6 consecutive days without a rest day', () => {
    const shifts: ShiftInterval[] = [
      { startTime: '2026-10-01T08:00:00Z', endTime: '2026-10-01T16:00:00Z' },
      { startTime: '2026-10-02T08:00:00Z', endTime: '2026-10-02T16:00:00Z' },
      { startTime: '2026-10-03T08:00:00Z', endTime: '2026-10-03T16:00:00Z' },
      { startTime: '2026-10-04T08:00:00Z', endTime: '2026-10-04T16:00:00Z' },
      { startTime: '2026-10-05T08:00:00Z', endTime: '2026-10-05T16:00:00Z' },
      { startTime: '2026-10-06T08:00:00Z', endTime: '2026-10-06T16:00:00Z' }, // 6th consecutive day
    ];

    const result = checkFatigue(shifts, 10, 6);
    expect(result.hasFatigueRisk).toBe(true);
    expect(result.consecutiveDaysViolated).toBe(true);
    expect(result.consecutiveDaysWorked).toBe(6);
    expect(result.reasons.some((r) => r.includes('6 consecutive work days'))).toBe(true);
  });

  it('handles empty or single shift without errors', () => {
    expect(checkFatigue([]).hasFatigueRisk).toBe(false);
    expect(
      checkFatigue([
        { startTime: '2026-10-01T08:00:00Z', endTime: '2026-10-01T16:00:00Z' },
      ]).hasFatigueRisk
    ).toBe(false);
  });
});
