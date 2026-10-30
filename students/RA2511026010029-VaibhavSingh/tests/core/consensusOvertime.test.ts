import { describe, it, expect } from 'vitest';
import {
  detectConsensusOvertime,
  StillWorkingPing,
} from '@/core/consensusOvertime';

describe('Consensus Overtime Anomaly Detection', () => {
  const scheduledEnd = '2026-10-20T17:00:00Z'; // 5:00 PM shift end

  it('triggers anomaly when >=3 distinct workers in one zone tap Still Working within 20 mins', () => {
    const pings: StillWorkingPing[] = [
      { workerId: 'w-1', zone: 'Hostel Block A', timestamp: '2026-10-20T17:05:00Z' },
      { workerId: 'w-2', zone: 'Hostel Block A', timestamp: '2026-10-20T17:12:00Z' },
      { workerId: 'w-3', zone: 'Hostel Block A', timestamp: '2026-10-20T17:18:00Z' },
    ];

    const result = detectConsensusOvertime('Hostel Block A', scheduledEnd, pings);
    expect(result.isAnomaly).toBe(true);
    expect(result.workerCount).toBe(3);
    expect(result.zone).toBe('Hostel Block A');
    expect(result.details).toContain('Consensus Overtime Anomaly');
  });

  it('does NOT trigger anomaly when pings occur in different zones', () => {
    const pings: StillWorkingPing[] = [
      { workerId: 'w-1', zone: 'Hostel Block A', timestamp: '2026-10-20T17:05:00Z' },
      { workerId: 'w-2', zone: 'Tech Park Floor 4', timestamp: '2026-10-20T17:08:00Z' },
      { workerId: 'w-3', zone: 'Central Library', timestamp: '2026-10-20T17:15:00Z' },
    ];

    const result = detectConsensusOvertime('Hostel Block A', scheduledEnd, pings);
    expect(result.isAnomaly).toBe(false);
    expect(result.workerCount).toBe(1);
  });

  it('does NOT trigger anomaly if pings occur AFTER the 20-minute post-shift window', () => {
    const pings: StillWorkingPing[] = [
      { workerId: 'w-1', zone: 'Hostel Block A', timestamp: '2026-10-20T17:25:00Z' }, // 25 mins later
      { workerId: 'w-2', zone: 'Hostel Block A', timestamp: '2026-10-20T17:26:00Z' },
      { workerId: 'w-3', zone: 'Hostel Block A', timestamp: '2026-10-20T17:28:00Z' },
    ];

    const result = detectConsensusOvertime('Hostel Block A', scheduledEnd, pings);
    expect(result.isAnomaly).toBe(false);
    expect(result.workerCount).toBe(0);
  });

  it('ignores duplicate taps by the same worker', () => {
    const pings: StillWorkingPing[] = [
      { workerId: 'w-1', zone: 'Hostel Block A', timestamp: '2026-10-20T17:02:00Z' },
      { workerId: 'w-1', zone: 'Hostel Block A', timestamp: '2026-10-20T17:05:00Z' }, // Duplicate
      { workerId: 'w-2', zone: 'Hostel Block A', timestamp: '2026-10-20T17:10:00Z' },
    ];

    const result = detectConsensusOvertime('Hostel Block A', scheduledEnd, pings);
    expect(result.isAnomaly).toBe(false);
    expect(result.workerCount).toBe(2);
  });
});
