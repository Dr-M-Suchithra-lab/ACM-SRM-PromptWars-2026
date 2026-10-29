import { describe, it, expect } from 'vitest';
import { RIGHTS_SCENARIOS, LEGAL_DISCLAIMER, LAST_REVIEWED_DATE } from '@/config/rights';
import { HELPLINES } from '@/config/helplines';

describe('Legal Rights and Guidance Verification', () => {
  it('contains mandatory disclaimer and last reviewed date', () => {
    expect(LEGAL_DISCLAIMER).toBe('General information, not legal advice.');
    expect(LAST_REVIEWED_DATE).toContain('2026');
  });

  it('verifies all 6 core workplace scenarios exist with all 4 required blocks', () => {
    expect(RIGHTS_SCENARIOS.length).toBe(6);

    for (const scenario of RIGHTS_SCENARIOS) {
      // 1. "Do this now": 3 short steps
      expect(scenario.doThisNow, `Scenario ${scenario.id} must have 3 steps`).toHaveLength(3);
      for (const step of scenario.doThisNow) {
        expect(step.trim().length).toBeGreaterThan(10);
      }

      // 2. "Keep this proof": list of evidence
      expect(scenario.keepThisProof.length, `Scenario ${scenario.id} proof`).toBeGreaterThanOrEqual(2);

      // 3. "Who can help": valid helpline IDs
      expect(scenario.helplineIds.length, `Scenario ${scenario.id} helplines`).toBeGreaterThanOrEqual(1);
      for (const hid of scenario.helplineIds) {
        const found = HELPLINES.find((h) => h.id === hid);
        expect(found, `Helpline ID ${hid} in scenario ${scenario.id} must exist`).toBeDefined();
      }

      // 4. "Make my letter": template
      expect(scenario.letterTemplate.subject.length).toBeGreaterThan(5);
      expect(scenario.letterTemplate.bodyIntro.length).toBeGreaterThan(10);
      expect(scenario.letterTemplate.bodyDemand.length).toBeGreaterThan(10);
    }
  });

  it('verifies statutory helplines: 112, 108, 181, 15100, 14434', () => {
    const numbers = HELPLINES.map((h) => h.number);
    expect(numbers).toContain('112'); // Police
    expect(numbers).toContain('108'); // Ambulance
    expect(numbers).toContain('181'); // Women
    expect(numbers).toContain('15100'); // NALSA
    expect(numbers).toContain('14434'); // e-Shram
  });

  it('correctly fills template variables in complaint letter generator', () => {
    const unpaidScenario = RIGHTS_SCENARIOS.find((s) => s.id === 'unpaid-wage')!;
    const template = unpaidScenario.letterTemplate.bodyDemand;

    const filled = template.replace('{{gapRupees}}', '2400');
    expect(filled).toContain('INR 2400');
    expect(filled).not.toContain('{{gapRupees}}');
  });
});
