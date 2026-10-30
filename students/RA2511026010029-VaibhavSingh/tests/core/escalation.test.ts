import { describe, it, expect } from 'vitest';
import { getEscalationStatus } from '@/core/escalation';

describe('Hazard Escalation Clock Logic', () => {
  const baseTime = new Date('2026-10-20T08:00:00Z');

  it('assigns Stage 1: SUPERVISOR when under 4 hours elapsed', () => {
    // 2 hours later
    const now = new Date('2026-10-20T10:00:00Z');
    const status = getEscalationStatus(baseTime, now);

    expect(status.stage).toBe('SUPERVISOR');
    expect(status.isBreached).toBe(false);
    expect(status.elapsedHours).toBe(2);
    expect(status.hoursUntilNextStage).toBe(2);
    expect(status.slaProgressPercent).toBe(50);
  });

  it('escalates to Stage 2: SAFETY_OFFICER between 4h and 24h', () => {
    // 10 hours later
    const now = new Date('2026-10-20T18:00:00Z');
    const status = getEscalationStatus(baseTime, now);

    expect(status.stage).toBe('SAFETY_OFFICER');
    expect(status.isBreached).toBe(true);
    expect(status.elapsedHours).toBe(10);
    expect(status.hoursUntilNextStage).toBe(14); // 24 - 10 = 14
    expect(status.actionRequired).toContain('Supervisor SLA breached');
  });

  it('escalates to Stage 3: PRINCIPAL_HEAD between 24h and 72h', () => {
    // 36 hours later
    const now = new Date('2026-10-21T20:00:00Z');
    const status = getEscalationStatus(baseTime, now);

    expect(status.stage).toBe('PRINCIPAL_HEAD');
    expect(status.isBreached).toBe(true);
    expect(status.elapsedHours).toBe(36);
    expect(status.hoursUntilNextStage).toBe(36); // 72 - 36 = 36
    expect(status.actionRequired).toContain('Principal Employer notified directly');
  });

  it('triggers Stage 4: AUTO_INCIDENT_REPORT when exceeding 72 hours', () => {
    // 80 hours later
    const now = new Date('2026-10-23T16:00:00Z');
    const status = getEscalationStatus(baseTime, now);

    expect(status.stage).toBe('AUTO_INCIDENT_REPORT');
    expect(status.isBreached).toBe(true);
    expect(status.hoursUntilNextStage).toBeNull();
    expect(status.actionRequired).toContain('Automatic incident dossier generated');
  });
});
