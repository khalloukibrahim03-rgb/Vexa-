export interface VideoPerformanceMetrics {
  views: number;
  ctr: number;               // Click-Through Rate (range: 0.0 to 1.0)
  impressions: number;
  averageViewDuration: number; // in seconds
  retentionRate: number;      // range: 0.0 to 1.0
  engagementScore: number;    // range: 0.0 to 1.0
}

export interface IAnalyticsProvider {
  /**
   * Fetches the performance metrics for a specific published video.
   */
  fetchVideoMetrics(platformVideoId: string): Promise<VideoPerformanceMetrics>;

  /**
   * Returns the provider name.
   */
  getProviderName(): string;
}
