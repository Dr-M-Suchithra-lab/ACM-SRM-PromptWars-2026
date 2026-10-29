export interface AiVisionAdvisory {
  suggestedResolved: boolean;
  confidenceScore: number; // 0.0 to 1.0
  notes: string;
  isMockDemoVerdict?: boolean;
}

export interface TicketClosureInput {
  hasAfterPhoto: boolean;
  reporterConfirmed: boolean;
  corroboratorCount: number;
  aiAdvisory?: AiVisionAdvisory;
}

export interface ClosureEvaluation {
  canClose: boolean;
  reason: string;
  missingRequirements: string[];
  isTwoKeyRuleSatisfied: boolean;
  aiAdvisorySummary: string;
}

/**
 * Two-Key Closure Rule:
 * No hazard or grievance ticket can be closed unless:
 * 1. An "After" remedy photo exists
 * AND
 * 2. EITHER the original reporter confirmed OR at least 2 distinct peer corroborators confirmed.
 *
 * NOTE: The AI photo check is strictly advisory; it assists human inspection
 * but can never unilaterally close or override the human Two-Key requirement.
 */
export function canCloseTicket(input: TicketClosureInput): ClosureEvaluation {
  const missingRequirements: string[] = [];

  if (!input.hasAfterPhoto) {
    missingRequirements.push('Supervisor or safety team must upload a photo of the completed repair.');
  }

  const hasWorkerConfirmation =
    input.reporterConfirmed || input.corroboratorCount >= 2;

  if (!hasWorkerConfirmation) {
    missingRequirements.push(
      'Worker confirmation required: Either the reporting worker must confirm resolution, OR at least 2 peer workers must corroborate the fix.'
    );
  }

  const isTwoKeyRuleSatisfied = input.hasAfterPhoto && hasWorkerConfirmation;

  const aiAdvisorySummary = input.aiAdvisory
    ? `AI Advisory Verdict (Advisory Only): ${
        input.aiAdvisory.suggestedResolved ? 'Likely Remediated' : 'Potential Incomplete Remedy'
      } (${Math.round(input.aiAdvisory.confidenceScore * 100)}% confidence). ${input.aiAdvisory.notes}`
    : 'No AI vision check run.';

  let reason = '';
  if (isTwoKeyRuleSatisfied) {
    reason =
      'Two-Key verification complete: Remedy photo verified and worker confirmation authenticated. Ticket safely closed.';
  } else {
    reason = `Ticket remains OPEN: ${missingRequirements.join(' ')}`;
  }

  return {
    canClose: isTwoKeyRuleSatisfied,
    reason,
    missingRequirements,
    isTwoKeyRuleSatisfied,
    aiAdvisorySummary,
  };
}
