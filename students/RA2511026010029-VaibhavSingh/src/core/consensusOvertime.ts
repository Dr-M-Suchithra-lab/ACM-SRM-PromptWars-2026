export interface StillWorkingPing {
  workerId: string;
  zone: string;
  timestamp: string; // ISO string
}

export interface ConsensusOvertimeAnomaly {
  isAnomaly: boolean;
  zone: string;
  workerCount: number;
  participatingWorkers: string[];
  windowStart: string;
  windowEnd: string;
  details: string;
}

export const CONSENSUS_THRESHOLD = 3;
export const POST_SHIFT_WINDOW_MINUTES = 20;

/**
 * Detects unlogged overtime through worker peer consensus:
 * If 3 or more distinct workers in one zone tap "Still working"
 * within a 20-minute window after scheduled shift end, flags an anomaly.
 */
export function detectConsensusOvertime(
  zone: string,
  scheduledShiftEndIso: string,
  pings: StillWorkingPing[],
  windowMinutes = POST_SHIFT_WINDOW_MINUTES,
  threshold = CONSENSUS_THRESHOLD
): ConsensusOvertimeAnomaly {
  const shiftEndMs = new Date(scheduledShiftEndIso).getTime();
  const windowEndMs = shiftEndMs + windowMinutes * 60 * 1000;

  // Filter pings within the post-shift window and matching the zone
  const validPingsInWindow = pings.filter((ping) => {
    if (ping.zone !== zone) return false;
    const pingTimeMs = new Date(ping.timestamp).getTime();
    return pingTimeMs >= shiftEndMs && pingTimeMs <= windowEndMs;
  });

  // Extract distinct workers
  const distinctWorkerMap = new Map<string, StillWorkingPing>();
  for (const ping of validPingsInWindow) {
    if (!distinctWorkerMap.has(ping.workerId)) {
      distinctWorkerMap.set(ping.workerId, ping);
    }
  }

  const distinctWorkers = Array.from(distinctWorkerMap.keys());
  const workerCount = distinctWorkers.length;
  const isAnomaly = workerCount >= threshold;

  const windowStart = new Date(shiftEndMs).toISOString();
  const windowEnd = new Date(windowEndMs).toISOString();

  let details = '';
  if (isAnomaly) {
    details = `Consensus Overtime Anomaly: ${workerCount} workers confirmed still working in zone "${zone}" within ${windowMinutes} minutes after scheduled shift end. Contractor unlogged overtime alert triggered.`;
  } else {
    details = `${workerCount} ping(s) recorded in zone "${zone}". Threshold of ${threshold} workers not met.`;
  }

  return {
    isAnomaly,
    zone,
    workerCount,
    participatingWorkers: isAnomaly ? distinctWorkers : [],
    windowStart,
    windowEnd,
    details,
  };
}
