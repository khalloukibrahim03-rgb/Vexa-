import { describe, it, expect, vi } from 'vitest';
import { LearningEngine } from '../pipeline/LearningEngine.js';
import { VideoPerformanceMetrics } from '../providers/interfaces/IAnalyticsProvider.js';

// Mock database operations cleanly
vi.mock('@vexa/database', () => {
  const strategiesDb = new Map<string, any>();
  const mockPrisma = {
    strategyVersion: {
      findUnique: vi.fn().mockImplementation((args) => {
        const id = args.where.id;
        return Promise.resolve(strategiesDb.get(id) || null);
      }),
      create: vi.fn().mockImplementation((args) => {
        const id = `strat_${Math.random().toString(36).substr(2, 9)}`;
        const record = { id, ...args.data, createdAt: new Date() };
        strategiesDb.set(id, record);
        return Promise.resolve(record);
      }),
      update: vi.fn().mockImplementation((args) => {
        const id = args.where.id;
        const record = strategiesDb.get(id);
        if (!record) return Promise.resolve(null);
        const updated = { ...record, ...args.data };
        strategiesDb.set(id, updated);
        return Promise.resolve(updated);
      }),
    },
    $transaction: vi.fn().mockImplementation(async (callback) => {
      return callback(mockPrisma);
    }),
  };
  return {
    prisma: mockPrisma,
    default: mockPrisma,
  };
});

describe('VEXA Learning Engine & Feedback Loops Unit Tests', () => {
  const channelId = 'chan-999';

  it('should create version-incremented StrategyVersion when performance falls below prediction', async () => {
    // Register initial strategy
    const { prisma } = await import('@vexa/database');
    const initialStrategy = await prisma.strategyVersion.create({
      data: {
        channelId,
        version: 1,
        rules: { niche: 'AI Tech' },
        thresholds: { minOpportunityThreshold: 0.70, minConfidenceThreshold: 0.75 },
        isActive: true,
      },
    });

    const prediction = { predictedCtr: 0.08, predictedViews: 10000 };
    const actualLow: VideoPerformanceMetrics = {
      views: 5000,
      ctr: 0.05, // 5% (3% lower than predicted 8% CTR - triggers adjustment)
      impressions: 100000,
      averageViewDuration: 180,
      retentionRate: 0.40,
      engagementScore: 0.50,
    };

    const feedback = await LearningEngine.evaluateAndLearn(
      channelId,
      initialStrategy.id,
      prediction,
      actualLow
    );

    expect(feedback.success).toBe(true);
    expect(feedback.newStrategyVersion).toBeDefined();
    expect(feedback.newStrategyVersion!.version).toBe(2);
    expect(feedback.newStrategyVersion!.isActive).toBe(true);

    // Thresholds must be raised dynamically
    const thresholds = feedback.newStrategyVersion!.thresholds as Record<string, any>;
    expect(thresholds['minOpportunityThreshold']).toBeGreaterThan(0.70);
    expect(feedback.lesson).toContain('Raised minimum opportunity threshold');
  });

  it('should safely rollback strategy versions', async () => {
    const { prisma } = await import('@vexa/database');
    const stratActive = await prisma.strategyVersion.create({
      data: { channelId, version: 3, rules: {}, thresholds: {}, isActive: true },
    });
    const stratFallback = await prisma.strategyVersion.create({
      data: { channelId, version: 2, rules: {}, thresholds: {}, isActive: false },
    });

    const rolledBack = await LearningEngine.rollbackStrategy(stratActive.id, stratFallback.id);
    expect(rolledBack.id).toBe(stratFallback.id);
    expect(rolledBack.isActive).toBe(true);

    const oldActive = await prisma.strategyVersion.findUnique({ where: { id: stratActive.id } });
    expect(oldActive!.isActive).toBe(false);
  });
});
