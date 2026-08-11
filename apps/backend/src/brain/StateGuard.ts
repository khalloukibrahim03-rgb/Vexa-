import { JobStatus, DecisionOutcome } from '@vexa/database';
import { logger } from '../utils/logger.js';

export interface StateGuardConfig {
  mode: 'MANUAL' | 'AUTONOMOUS';
  maxDailyRuns: number;          // e.g., 2 videos per day limit
  minAutoConfidence: number;     // e.g., 0.85 (confidence required to auto-publish)
}

export class StateGuard {
  /**
   * Evaluates the active execution state and returns the target JobStatus.
   * Ensures safety overrides and mode controls are strictly observed.
   */
  static determineJobTargetStatus(
    config: StateGuardConfig,
    decisionOutcome: DecisionOutcome,
    confidenceScore: number,
    dailyRunsCount: number
  ): JobStatus {
    logger.info(
      { mode: config.mode, decision: decisionOutcome, confidenceScore, dailyRunsCount },
      'Evaluating job transition safety gates'
    );

    // 1. Hard safeguard: Limit daily autonomous executions
    if (dailyRunsCount >= config.maxDailyRuns) {
      logger.warn({ dailyRunsCount }, 'Autonomous daily limit breached. Forcing PAUSED/WAITING_APPROVAL.');
      return 'WAITING_APPROVAL';
    }

    // 2. If decision is not PRODUCE, it doesn't enter the production queue pipeline
    if (decisionOutcome !== 'PRODUCE') {
      return 'COMPLETED';
    }

    // 3. Mode Evaluation
    if (config.mode === 'MANUAL') {
      logger.info('System is in MANUAL mode. Redirecting job to WAITING_APPROVAL.');
      return 'WAITING_APPROVAL';
    }

    // 4. Autonomous mode confidence checks
    if (confidenceScore < config.minAutoConfidence) {
      logger.info(
        { confidenceScore, threshold: config.minAutoConfidence },
        'Autonomous confidence below required auto threshold. Redirecting to WAITING_APPROVAL.'
      );
      return 'WAITING_APPROVAL';
    }

    logger.info('Safety gates passed successfully. Initializing job with RUNNING/QUEUED.');
    return 'QUEUED';
  }
}
export default StateGuard;
