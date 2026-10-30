import { describe, it, expect } from 'vitest';
import { canCloseTicket } from '@/core/closure';

describe('Two-Key Ticket Closure Principle', () => {
  it('blocks closure when After photo is missing, even if reporter confirmed', () => {
    const result = canCloseTicket({
      hasAfterPhoto: false,
      reporterConfirmed: true,
      corroboratorCount: 0,
    });

    expect(result.canClose).toBe(false);
    expect(result.missingRequirements).toContain(
      'Supervisor or safety team must upload a photo of the completed repair.'
    );
  });

  it('blocks closure when After photo exists, but worker has not confirmed', () => {
    const result = canCloseTicket({
      hasAfterPhoto: true,
      reporterConfirmed: false,
      corroboratorCount: 0,
    });

    expect(result.canClose).toBe(false);
    expect(result.missingRequirements.some((r) => r.includes('Worker confirmation required'))).toBe(true);
  });

  it('permits closure when After photo exists AND reporter confirmed', () => {
    const result = canCloseTicket({
      hasAfterPhoto: true,
      reporterConfirmed: true,
      corroboratorCount: 0,
    });

    expect(result.canClose).toBe(true);
    expect(result.isTwoKeyRuleSatisfied).toBe(true);
    expect(result.reason).toContain('Two-Key verification complete');
  });

  it('permits closure when After photo exists AND 2 peer corroborators confirmed', () => {
    const result = canCloseTicket({
      hasAfterPhoto: true,
      reporterConfirmed: false, // original reporter on leave/unavailable
      corroboratorCount: 2, // 2 peers verified
    });

    expect(result.canClose).toBe(true);
    expect(result.isTwoKeyRuleSatisfied).toBe(true);
  });

  it('treats AI vision checks as ADVISORY ONLY - cannot close without human Two-Key confirmation', () => {
    // AI says 99% confident it is fixed, but neither reporter nor corroborator confirmed
    const result = canCloseTicket({
      hasAfterPhoto: true,
      reporterConfirmed: false,
      corroboratorCount: 0,
      aiAdvisory: {
        suggestedResolved: true,
        confidenceScore: 0.99,
        notes: 'AI Model detected clean hazard area',
      },
    });

    expect(result.canClose).toBe(false);
    expect(result.aiAdvisorySummary).toContain('Advisory Only');
    expect(result.missingRequirements.length).toBeGreaterThan(0);
  });
});
