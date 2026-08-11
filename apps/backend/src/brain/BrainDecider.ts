import { prisma, DecisionOutcome, DecisionRecord } from '@vexa/database';
import { MarketSignal } from '../providers/interfaces/IResearchProvider.js';
import { calculateOpportunityScore } from '../utils/scoring.js';
import { logger } from '../utils/logger.js';

export interface BrainDeciderConfig {
  channelId: string;
  strategyVersionId: string;
  minConfidenceThreshold: number; // e.g., 0.70
  minOpportunityThreshold: number;  // e.g., 0.75
  maxFailuresAllowed: number;       // e.g., 3
}

export class BrainDecider {
  /**
   * Deterministically evaluates market opportunities and active failures to produce a signed DecisionRecord.
   */
  static async evaluate(
    config: BrainDeciderConfig,
    activeSignals: MarketSignal[],
    recentFailuresCount: number
  ): Promise<DecisionRecord> {
    logger.info({ channelId: config.channelId }, 'Brain Decider initiated opportunity evaluation');

    // 1. Safety Guard: If failure count exceeds the threshold, halt immediately with PAUSE_FOR_HUMAN
    if (recentFailuresCount >= config.maxFailuresAllowed) {
      logger.warn({ recentFailuresCount }, 'Critical failure threshold breached. Triggering PAUSE_FOR_HUMAN.');
      return this.persistDecision({
        config,
        decision: 'PAUSE_FOR_HUMAN',
        confidenceScore: 1.0,
        evidence: { reason: 'Recent failure limit breached', failuresCount: recentFailuresCount },
        context: { activeSignals, failuresCount: recentFailuresCount },
        alternatives: ['DO_NOTHING'],
        rejectionReasons: ['Failure limits hit'],
        expectedOutcome: 'Human operator intervention and diagnostic investigation',
      });
    }

    // 2. Opportunities Check: If zero market signals exist, DO_NOTHING
    if (activeSignals.length === 0) {
      logger.info('No market signals gathered. Deciding DO_NOTHING.');
      return this.persistDecision({
        config,
        decision: 'DO_NOTHING',
        confidenceScore: 0.5,
        evidence: { reason: 'No market signals available' },
        context: { activeSignals, failuresCount: recentFailuresCount },
        alternatives: ['RESEARCH_MORE'],
        rejectionReasons: [],
        expectedOutcome: 'System remains idle until new topics emerge',
      });
    }

    // 3. Score opportunities
    const evaluatedOpportunities = activeSignals.map((signal) => {
      const opportunityScore = calculateOpportunityScore(signal);
      return {
        ...signal,
        opportunityScore,
      };
    });

    // Find best opportunity
    const bestOpportunity = evaluatedOpportunities.reduce((best, current) =>
      current.opportunityScore > best.opportunityScore ? current : best
    , evaluatedOpportunities[0]!);

    logger.info(
      { topic: bestOpportunity.topic, score: bestOpportunity.opportunityScore },
      'Evaluated best opportunity signal'
    );

    // 4. Decision Tree Gating
    let finalDecision: DecisionOutcome = 'DO_NOTHING';
    let confidenceScore = bestOpportunity.confidence;
    const rejectionReasons: string[] = [];
    const alternatives: DecisionOutcome[] = [];

    if (bestOpportunity.opportunityScore >= config.minOpportunityThreshold) {
      if (bestOpportunity.confidence >= config.minConfidenceThreshold) {
        finalDecision = 'PRODUCE';
        alternatives.push('RESEARCH_MORE', 'DO_NOTHING');
      } else {
        finalDecision = 'RESEARCH_MORE';
        rejectionReasons.push('Topic confidence is below confidence threshold');
        alternatives.push('DO_NOTHING');
      }
    } else {
      finalDecision = 'DO_NOTHING';
      rejectionReasons.push('Niche opportunity score below opportunity threshold');
      alternatives.push('RESEARCH_MORE');
    }

    return this.persistDecision({
      config,
      decision: finalDecision,
      confidenceScore,
      evidence: {
        targetTopic: bestOpportunity.topic,
        opportunityScore: bestOpportunity.opportunityScore,
        confidence: bestOpportunity.confidence,
        lifecycle: bestOpportunity.lifecycle,
      },
      context: { activeSignals: evaluatedOpportunities, failuresCount: recentFailuresCount },
      alternatives,
      rejectionReasons,
      expectedOutcome: finalDecision === 'PRODUCE'
        ? `Generate script draft and scene layouts for: ${bestOpportunity.topic}`
        : 'Wait or conduct additional niche sweeps',
    });
  }

  private static async persistDecision(args: {
    config: BrainDeciderConfig;
    decision: DecisionOutcome;
    confidenceScore: number;
    evidence: Record<string, any>;
    context: Record<string, any>;
    alternatives: string[];
    rejectionReasons: string[];
    expectedOutcome: string;
  }): Promise<DecisionRecord> {
    const correlationId = `corr_${Math.random().toString(36).substr(2, 9)}`;

    return prisma.decisionRecord.create({
      data: {
        channelId: args.config.channelId,
        strategyVersionId: args.config.strategyVersionId,
        decision: args.decision,
        confidenceScore: args.confidenceScore,
        evidence: args.evidence,
        context: args.context,
        alternatives: args.alternatives,
        rejectionReasons: args.rejectionReasons,
        expectedOutcome: args.expectedOutcome,
        correlationId,
      },
    });
  }
}
export default BrainDecider;
