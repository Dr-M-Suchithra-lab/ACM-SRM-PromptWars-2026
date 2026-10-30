export type EscalationStage =
  | 'SUPERVISOR'
  | 'SAFETY_OFFICER'
  | 'PRINCIPAL_HEAD'
  | 'AUTO_INCIDENT_REPORT';

export interface EscalationStatus {
  elapsedHours: number;
  stage: EscalationStage;
  stageTitle: string;
  isBreached: boolean;
  hoursUntilNextStage: number | null;
  slaProgressPercent: number; // 0 to 100 for current active SLA stage
  actionRequired: string;
}

export const ESCALATION_THRESHOLDS = {
  SUPERVISOR_HOURS: 4,
  SAFETY_OFFICER_HOURS: 24,
  PRINCIPAL_HEAD_HOURS: 72,
} as const;

/**
 * Pure function of createdAt and now that computes statutory hazard escalation stage.
 * Clock rules:
 * - 0 - 4h: Supervisor
 * - 4 - 24h: Safety Officer
 * - 24 - 72h: Principal Head
 * - >= 72h: Auto Incident Report
 */
export function getEscalationStatus(
  createdAt: string | Date,
  now: string | Date = new Date()
): EscalationStatus {
  const createdMs = new Date(createdAt).getTime();
  const nowMs = new Date(now).getTime();
  const elapsedMs = Math.max(0, nowMs - createdMs);
  const elapsedHours = Number((elapsedMs / (1000 * 60 * 60)).toFixed(2));

  if (elapsedHours < ESCALATION_THRESHOLDS.SUPERVISOR_HOURS) {
    const remaining = Number((ESCALATION_THRESHOLDS.SUPERVISOR_HOURS - elapsedHours).toFixed(1));
    const progress = Math.min(100, Math.round((elapsedHours / ESCALATION_THRESHOLDS.SUPERVISOR_HOURS) * 100));
    return {
      elapsedHours,
      stage: 'SUPERVISOR',
      stageTitle: 'Stage 1: Supervisor Review',
      isBreached: false,
      hoursUntilNextStage: remaining,
      slaProgressPercent: progress,
      actionRequired: `Supervisor must inspect site and upload After-remedy photo within ${remaining}h.`,
    };
  }

  if (elapsedHours < ESCALATION_THRESHOLDS.SAFETY_OFFICER_HOURS) {
    const stageElapsed = elapsedHours - ESCALATION_THRESHOLDS.SUPERVISOR_HOURS;
    const stageDuration = ESCALATION_THRESHOLDS.SAFETY_OFFICER_HOURS - ESCALATION_THRESHOLDS.SUPERVISOR_HOURS;
    const remaining = Number((ESCALATION_THRESHOLDS.SAFETY_OFFICER_HOURS - elapsedHours).toFixed(1));
    const progress = Math.min(100, Math.round((stageElapsed / stageDuration) * 100));
    return {
      elapsedHours,
      stage: 'SAFETY_OFFICER',
      stageTitle: 'Stage 2: Safety Officer Intervention',
      isBreached: true,
      hoursUntilNextStage: remaining,
      slaProgressPercent: progress,
      actionRequired: `Supervisor SLA breached (4h). Safety Officer summoned. ${remaining}h until Principal Employer alert.`,
    };
  }

  if (elapsedHours < ESCALATION_THRESHOLDS.PRINCIPAL_HEAD_HOURS) {
    const stageElapsed = elapsedHours - ESCALATION_THRESHOLDS.SAFETY_OFFICER_HOURS;
    const stageDuration = ESCALATION_THRESHOLDS.PRINCIPAL_HEAD_HOURS - ESCALATION_THRESHOLDS.SAFETY_OFFICER_HOURS;
    const remaining = Number((ESCALATION_THRESHOLDS.PRINCIPAL_HEAD_HOURS - elapsedHours).toFixed(1));
    const progress = Math.min(100, Math.round((stageElapsed / stageDuration) * 100));
    return {
      elapsedHours,
      stage: 'PRINCIPAL_HEAD',
      stageTitle: 'Stage 3: Principal Employer Escalation',
      isBreached: true,
      hoursUntilNextStage: remaining,
      slaProgressPercent: progress,
      actionRequired: `Safety Officer SLA breached (24h). Principal Employer notified directly. ${remaining}h to Auto Incident Report.`,
    };
  }

  return {
    elapsedHours,
    stage: 'AUTO_INCIDENT_REPORT',
    stageTitle: 'Stage 4: Statutory Incident Dossier Triggered',
    isBreached: true,
    hoursUntilNextStage: null,
    slaProgressPercent: 100,
    actionRequired:
      '72 hours exceeded without verified remedy. Automatic incident dossier generated for institutional audit and labour inspection.',
  };
}
