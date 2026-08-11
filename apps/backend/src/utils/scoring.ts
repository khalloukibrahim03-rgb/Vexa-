import { MarketSignal } from '../providers/interfaces/IResearchProvider.js';

export interface ScoringWeights {
  momentumWeight: number;    // default: 0.35
  demandWeight: number;      // default: 0.35
  noveltyWeight: number;     // default: 0.15
  competitionWeight: number;  // default: 0.15 (negative weight subtractor)
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  momentumWeight: 0.35,
  demandWeight: 0.35,
  noveltyWeight: 0.15,
  competitionWeight: 0.15,
};

/**
 * Calculates a deterministic composite Opportunity Score for a Market Signal.
 * Formula: (Momentum * Wm) + (Demand * Wd) + (Novelty * Wn) - (Competition * Wc)
 * Normalized and clamped tightly between 0.0 and 1.0.
 */
export function calculateOpportunityScore(
  signal: MarketSignal,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): number {
  const { momentum, demand, novelty, competition } = signal;
  const { momentumWeight, demandWeight, noveltyWeight, competitionWeight } = weights;

  // Composite calculation
  const rawScore =
    momentum * momentumWeight +
    demand * demandWeight +
    novelty * noveltyWeight -
    competition * competitionWeight;

  // Clamp strictly between 0.0 and 1.0
  const clampedScore = Math.max(0, Math.min(1, rawScore));

  // Return score rounded to 4 decimal places for precision
  return Math.round(clampedScore * 10000) / 10000;
}
