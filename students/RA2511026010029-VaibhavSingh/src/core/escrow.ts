export interface ComplaintReport {
  id: string;
  workerId: string; // Hashed/anonymized worker identifier
  category: 'wage_theft' | 'unsafe_equipment' | 'harassment' | 'injury' | 'life_risk' | 'general';
  targetType: 'zone' | 'supervisor';
  targetId: string; // e.g. "Hostel Block A" or "supervisor-01"
  timestamp: string;
  sanitizedSummary: string;
}

export interface EscrowVaultStatus {
  targetId: string;
  isUnlocked: boolean;
  isUrgentBypass: boolean;
  distinctWorkerCount: number; // Note: Suppressed if under 3
  publicCountDisplay: string; // "Protected (< 3)" or "3+ workers reported"
  status: 'LOCKED' | 'UNLOCKED_GROUP_ALERT' | 'URGENT_UNLOCKED';
  reports: ComplaintReport[];
}

export const URGENT_CATEGORIES = new Set<string>([
  'injury',
  'harassment',
  'life_risk',
]);

export const ESCROW_THRESHOLD_K = 3;

/**
 * Evaluates Collective Escrow for a collection of reports for a target (zone or supervisor).
 * - Complaints stay locked until K=3 distinct workers report the same target.
 * - Urgent categories bypass escrow immediately.
 * - Suppresses any group count under 3 to prevent identification.
 */
export function evaluateEscrowGroup(
  targetId: string,
  reports: ComplaintReport[]
): EscrowVaultStatus {
  if (!reports || reports.length === 0) {
    return {
      targetId,
      isUnlocked: false,
      isUrgentBypass: false,
      distinctWorkerCount: 0,
      publicCountDisplay: 'No reports',
      status: 'LOCKED',
      reports: [],
    };
  }

  // Check for urgent bypass
  const hasUrgentReport = reports.some((r) => URGENT_CATEGORIES.has(r.category));

  // Count distinct workers reporting this target
  const distinctWorkers = new Set<string>(reports.map((r) => r.workerId));
  const distinctCount = distinctWorkers.size;

  if (hasUrgentReport) {
    return {
      targetId,
      isUnlocked: true,
      isUrgentBypass: true,
      distinctWorkerCount: distinctCount,
      publicCountDisplay: `${distinctCount} worker(s) - Urgent Escalation`,
      status: 'URGENT_UNLOCKED',
      reports,
    };
  }

  if (distinctCount >= ESCROW_THRESHOLD_K) {
    return {
      targetId,
      isUnlocked: true,
      isUrgentBypass: false,
      distinctWorkerCount: distinctCount,
      publicCountDisplay: `${distinctCount} workers confirmed`,
      status: 'UNLOCKED_GROUP_ALERT',
      reports,
    };
  }

  // Under threshold: LOCKED and count SUPPRESSED for privacy
  return {
    targetId,
    isUnlocked: false,
    isUrgentBypass: false,
    distinctWorkerCount: 0, // suppressed for privacy
    publicCountDisplay: 'Protected (threshold not met)',
    status: 'LOCKED',
    reports: [], // Withheld while locked
  };
}
