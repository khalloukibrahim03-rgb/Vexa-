import { IAnalyticsProvider, VideoPerformanceMetrics } from '../interfaces/IAnalyticsProvider.js';
import { logger } from '../../utils/logger.js';

/**
 * MockAnalyticsProvider — [MOCKED / SIMULATED]
 * Simulates fetching high-fidelity analytics and performance matrices for our learning loops.
 */
export class MockAnalyticsProvider implements IAnalyticsProvider {
  async fetchVideoMetrics(platformVideoId: string): Promise<VideoPerformanceMetrics> {
    logger.info({ platformVideoId }, '[MOCKED / SIMULATED] fetchVideoMetrics invoked');

    // Return deterministic mock performance metrics
    return {
      views: 12500,
      ctr: 0.085,               // 8.5% CTR (excellent)
      impressions: 147000,
      averageViewDuration: 240, // 4 minutes
      retentionRate: 0.55,      // 55% retention (high)
      engagementScore: 0.78,
    };
  }

  getProviderName(): string {
    return 'MockAnalyticsProvider';
  }
}
export default MockAnalyticsProvider;
