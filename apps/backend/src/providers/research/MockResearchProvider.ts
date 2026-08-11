import { IResearchProvider, MarketSignal } from '../interfaces/IResearchProvider.js';

/**
 * MockResearchProvider — [MOCKED / SIMULATED]
 * Provides deterministic simulation payloads for local research scanning and keyword searches.
 */
export class MockResearchProvider implements IResearchProvider {
  private mockSignals: MarketSignal[] = [
    {
      topic: 'Autonomous Agent Workflows in Node.js',
      momentum: 0.88,
      competition: 0.35,
      lifecycle: 'GROWING',
      novelty: 0.75,
      demand: 0.82,
      confidence: 0.90,
      evidence: { source: 'Google Trends Simulation', searchVolumeDelta: '+45%' },
      timestamp: new Date().toISOString(),
    },
    {
      topic: 'How to build $0 Staging Environments',
      momentum: 0.95,
      competition: 0.65,
      lifecycle: 'VIRAL',
      novelty: 0.85,
      demand: 0.94,
      confidence: 0.95,
      evidence: { source: 'Reddit Sub Signals', commentsActivity: 'High' },
      timestamp: new Date().toISOString(),
    },
    {
      topic: 'FFmpeg vs Remotion Memory Consumption',
      momentum: 0.45,
      competition: 0.15,
      lifecycle: 'STEADY',
      novelty: 0.60,
      demand: 0.52,
      confidence: 0.80,
      evidence: { source: 'GitHub Repos Scrapes', starGrowth: 'Normal' },
      timestamp: new Date().toISOString(),
    },
    {
      topic: 'Android Mobile Keyboard Dependencies Explored',
      momentum: 0.20,
      competition: 0.90,
      lifecycle: 'DECLINING',
      novelty: 0.15,
      demand: 0.25,
      confidence: 0.85,
      evidence: { source: 'Developer Survey Simulation', searchGrowth: '-15%' },
      timestamp: new Date().toISOString(),
    },
  ];

  async fetchTrendingSignals(niche: string): Promise<MarketSignal[]> {
    // Label mock operations clearly
    // console.log(`[MOCKED / SIMULATED] fetchTrendingSignals invoked for niche: ${niche}`);
    return this.mockSignals;
  }

  async searchKeywordSignals(query: string): Promise<MarketSignal | null> {
    // console.log(`[MOCKED / SIMULATED] searchKeywordSignals invoked for query: ${query}`);
    const normalizedQuery = query.toLowerCase();
    const match = this.mockSignals.find((signal) =>
      signal.topic.toLowerCase().includes(normalizedQuery)
    );
    return match || null;
  }
}
export default MockResearchProvider;
