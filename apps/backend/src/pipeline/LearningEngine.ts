import { prisma, StrategyVersion } from '@vexa/database';
import { VideoPerformanceMetrics } from '../providers/interfaces/IAnalyticsProvider.js';
import { logger } from '../utils/logger.js';

export interface PerformancePrediction {
  predictedCtr: number;      // e.g. 0.07 (7%)
  predictedViews: number;    // e.g. 10000
}

export class LearningEngine {
  /**
   * Runs the feedback loop to compare prediction vs actual engagement metrics.
   * Proposes and saves a new, version-incremented StrategyVersion based on strategic learning heuristics.
   */
  static async evaluateAndLearn(
    channelId: string,
    currentStrategyId: string,
    prediction: PerformancePrediction,
    actual: VideoPerformanceMetrics
  ): Promise<{ success: boolean; newStrategyVersion?: StrategyVersion; lesson: string }> {
    logger.info({ channelId, currentStrategyId }, 'Learning Engine initiated feedback evaluation');

    // Fetch the active strategy version details
    const activeStrategy = await prisma.strategyVersion.findUnique({
      where: { id: currentStrategyId },
    });

    if (!activeStrategy) {
      throw new Error(`Active StrategyVersion not found for ID: ${currentStrategyId}`);
    }

    // 1. Calculate CTR delta
    const ctrDelta = actual.ctr - prediction.predictedCtr;
    let lesson = '';
    const proposedThresholds = { ...(activeStrategy.thresholds as Record<string, any>) };
    const proposedRules = { ...(activeStrategy.rules as Record<string, any>) };

    // 2. Learning Heuristics:
    // If actual CTR is significantly lower than predicted CTR (delta < -0.015),
    // we must adjust our safety thresholds to avoid low-retention videos.
    // Mitigation: Increase minimum opportunity threshold and raise required confidence weight.
    if (ctrDelta < -0.015) {
      lesson = `Performance fell below prediction. Actual CTR (${actual.ctr}) was lower than predicted CTR (${prediction.predictedCtr}) by ${Math.abs(ctrDelta).toFixed(3)}. Action: Raised minimum opportunity threshold to restrict low-engagement themes.`;

      const currentMinOpp = proposedThresholds['minOpportunityThreshold'] || 0.70;
      proposedThresholds['minOpportunityThreshold'] = Math.min(0.95, currentMinOpp + 0.05);

      const currentMinConf = proposedThresholds['minConfidenceThreshold'] || 0.75;
      proposedThresholds['minConfidenceThreshold'] = Math.min(0.95, currentMinConf + 0.02);
    } else {
      lesson = `Performance matched or exceeded prediction. Delta CTR: +${ctrDelta.toFixed(3)}. Action: Maintained current strategy thresholds.`;
    }

    // 3. Atomically compile and commit the new, version-incremented StrategyVersion
    const nextVersionNumber = activeStrategy.version + 1;

    // We run a safe transaction to deactivate current strategy and activate the new version-incremented strategy
    const result = await prisma.$transaction(async (tx) => {
      // Deactivate current active strategy
      await tx.strategyVersion.update({
        where: { id: currentStrategyId },
        data: { isActive: false },
      });

      // Commit new, version-incremented StrategyVersion
      const newStrategy = await tx.strategyVersion.create({
        data: {
          channelId,
          version: nextVersionNumber,
          rules: proposedRules,
          thresholds: proposedThresholds,
          isActive: true,
        },
      });

      return newStrategy;
    });

    logger.info({ newVersion: result.version, lesson }, 'Successfully committed version-incremented StrategyVersion');

    return {
      success: true,
      newStrategyVersion: result,
      lesson,
    };
  }

  /**
   * Safely rolls back to a previous strategy version if experiments perform poorly.
   */
  static async rollbackStrategy(
    currentStrategyId: string,
    targetStrategyId: string
  ): Promise<StrategyVersion> {
    logger.info({ currentStrategyId, targetStrategyId }, 'Learning Engine executing safe rollback transaction');

    return prisma.$transaction(async (tx) => {
      // Deactivate active strategy
      await tx.strategyVersion.update({
        where: { id: currentStrategyId },
        data: { isActive: false },
      });

      // Activate target fallback strategy
      const rolledBack = await tx.strategyVersion.update({
        where: { id: targetStrategyId },
        data: { isActive: true },
      });

      return rolledBack;
    });
  }
}
export default LearningEngine;
