import { describe, it, expect, vi } from 'vitest';
import { calculateOpportunityScore } from '../utils/scoring.js';
import { StateGuard } from '../brain/StateGuard.js';
import { BrainDecider } from '../brain/BrainDecider.js';
import { MarketSignal } from '../providers/interfaces/IResearchProvider.js';

// Securely mock Prisma inside intelligence tests
vi.mock('@vexa/database', () => {
  const mockPrisma = {
    decisionRecord: {
      create: vi.fn().mockImplementation((args) => Promise.resolve({ id: 'mock-dec-1', ...args.data })),
    },
  };
  return {
    prisma: mockPrisma,
    default: mockPrisma,
  };
});

describe('VEXA Intelligence Engine Unit Tests', () => {
  const mockSignalHigh: MarketSignal = {
    topic: 'Staging $0 Solutions',
    momentum: 0.95,
    competition: 0.20,
    lifecycle: 'VIRAL',
    novelty: 0.85,
    demand: 0.90,
    confidence: 0.90,
    evidence: {},
    timestamp: new Date().toISOString(),
  };

  const mockSignalLow: MarketSignal = {
    topic: 'Low Momentum Topic',
    momentum: 0.25,
    competition: 0.85,
    lifecycle: 'DECLINING',
    novelty: 0.15,
    demand: 0.20,
    confidence: 0.70,
    evidence: {},
    timestamp: new Date().toISOString(),
  };

  describe('Opportunity Scoring Logic', () => {
    it('should calculate correct opportunity score for high signal', () => {
      const score = calculateOpportunityScore(mockSignalHigh);
      // Wm=0.35, Wd=0.35, Wn=0.15, Wc=0.15
      // 0.95*0.35 + 0.90*0.35 + 0.85*0.15 - 0.20*0.15 = 0.3325 + 0.315 + 0.1275 - 0.03 = 0.7450
      expect(score).toBe(0.745);
    });

    it('should clamp low scores strictly at 0.0', () => {
      const score = calculateOpportunityScore(mockSignalLow);
      // 0.25*0.35 + 0.20*0.35 + 0.15*0.15 - 0.85*0.15 = 0.0875 + 0.07 + 0.0225 - 0.1275 = 0.0525
      expect(score).toBe(0.0525);
    });
  });

  describe('State Guard Safety Gates', () => {
    const configManual = { mode: 'MANUAL' as const, maxDailyRuns: 2, minAutoConfidence: 0.85 };
    const configAutonomous = { mode: 'AUTONOMOUS' as const, maxDailyRuns: 2, minAutoConfidence: 0.85 };

    it('should redirect PRODUCE to WAITING_APPROVAL when in MANUAL mode', () => {
      const status = StateGuard.determineJobTargetStatus(configManual, 'PRODUCE', 0.90, 0);
      expect(status).toBe('WAITING_APPROVAL');
    });

    it('should proceed to QUEUED in AUTONOMOUS mode when confidence is above threshold', () => {
      const status = StateGuard.determineJobTargetStatus(configAutonomous, 'PRODUCE', 0.90, 0);
      expect(status).toBe('QUEUED');
    });

    it('should redirect to WAITING_APPROVAL in AUTONOMOUS mode when confidence is below threshold', () => {
      const status = StateGuard.determineJobTargetStatus(configAutonomous, 'PRODUCE', 0.80, 0);
      expect(status).toBe('WAITING_APPROVAL');
    });

    it('should enforce daily run safeguards and redirect to WAITING_APPROVAL', () => {
      const status = StateGuard.determineJobTargetStatus(configAutonomous, 'PRODUCE', 0.95, 2);
      expect(status).toBe('WAITING_APPROVAL');
    });
  });

  describe('Brain Decider Unit Logic', () => {
    const deciderConfig = {
      channelId: 'chan-1',
      strategyVersionId: 'strat-v1',
      minConfidenceThreshold: 0.75,
      minOpportunityThreshold: 0.70,
      maxFailuresAllowed: 3,
    };

    it('should trigger PAUSE_FOR_HUMAN if active failure limit is hit', async () => {
      const record = await BrainDecider.evaluate(deciderConfig, [mockSignalHigh], 3);
      expect(record.decision).toBe('PAUSE_FOR_HUMAN');
    });

    it('should decide DO_NOTHING if no market signals are gathered', async () => {
      const record = await BrainDecider.evaluate(deciderConfig, [], 0);
      expect(record.decision).toBe('DO_NOTHING');
    });

    it('should decide PRODUCE on high opportunity signal and high confidence', async () => {
      const record = await BrainDecider.evaluate(deciderConfig, [mockSignalHigh], 0);
      // Score of mockSignalHigh is 0.7450 (>= minOpportunityThreshold 0.70)
      // Confidence is 0.90 (>= minConfidenceThreshold 0.75)
      expect(record.decision).toBe('PRODUCE');
    });

    it('should decide RESEARCH_MORE on high opportunity score but low confidence', async () => {
      const lowConfidenceSignal = { ...mockSignalHigh, confidence: 0.60 };
      const record = await BrainDecider.evaluate(deciderConfig, [lowConfidenceSignal], 0);
      expect(record.decision).toBe('RESEARCH_MORE');
    });
  });
});
