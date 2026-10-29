import { describe, it, expect } from 'vitest';
import { calculateHeatIndex, assessHeatStress } from '@/core/heat';

describe('Heat Stress and Thermal Safety Assessment', () => {
  it('identifies SAFE conditions at 24C and 50% relative humidity', () => {
    const assessment = assessHeatStress(24, 50);
    expect(assessment.level).toBe('SAFE');
    expect(assessment.restMinutesPerHour).toBe(0);
    expect(assessment.workMinutesPerHour).toBe(60);
    expect(assessment.isOutdoorWorkRestricted).toBe(false);
  });

  it('triggers CAUTION at 30C and 60% humidity', () => {
    const assessment = assessHeatStress(30, 60);
    expect(['CAUTION', 'EXTREME_CAUTION']).toContain(assessment.level);
    expect(assessment.restMinutesPerHour).toBeGreaterThanOrEqual(10);
  });

  it('triggers DANGER or EXTREME_DANGER at 42C and 50% humidity', () => {
    const assessment = assessHeatStress(42, 50);
    expect(['DANGER', 'EXTREME_DANGER']).toContain(assessment.level);
    expect(assessment.restMinutesPerHour).toBeGreaterThanOrEqual(30);
    expect(assessment.hydrationRecommendation).toMatch(/water|electrolyte|ORS/i);
  });

  it('restricts heavy outdoor manual labor in EXTREME_DANGER conditions (48C)', () => {
    const assessment = assessHeatStress(48, 55);
    expect(assessment.level).toBe('EXTREME_DANGER');
    expect(assessment.isOutdoorWorkRestricted).toBe(true);
    expect(assessment.restMinutesPerHour).toBe(45);
    expect(assessment.actionGuidance).toContain('Cease strenuous outdoor manual labor');
  });

  it('accurately computes heat index values', () => {
    const hi = calculateHeatIndex(35, 70);
    // At 35C (95F) and 70% RH, heat index is severe (> 45C)
    expect(hi).toBeGreaterThan(45);
  });
});
