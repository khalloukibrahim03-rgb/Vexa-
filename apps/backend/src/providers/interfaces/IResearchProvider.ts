export interface MarketSignal {
  topic: string;
  momentum: number;          // Range: 0.0 to 1.0 (velocity / trend growth)
  competition: number;       // Range: 0.0 to 1.0 (density of competitive publishers)
  lifecycle: 'VIRAL' | 'GROWING' | 'STEADY' | 'DECLINING';
  novelty: number;           // Range: 0.0 to 1.0 (uniqueness/unexplored potential)
  demand: number;            // Range: 0.0 to 1.0 (estimated search/audience interest)
  confidence: number;        // Range: 0.0 to 1.0 (source data reliability score)
  evidence: Record<string, any>;
  timestamp: string;
}

export interface IResearchProvider {
  /**
   * Scans and aggregates trending market signals for a given channel category/niche.
   */
  fetchTrendingSignals(niche: string): Promise<MarketSignal[]>;

  /**
   * Searches and parses target competitive signals for a specific keyword or query.
   */
  searchKeywordSignals(query: string): Promise<MarketSignal | null>;
}
