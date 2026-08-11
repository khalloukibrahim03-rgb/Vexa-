import { IPublishingProvider, PublicationDetails } from '../interfaces/IPublishingProvider.js';
import { logger } from '../../utils/logger.js';

/**
 * MockPublishingProvider — [MOCKED / SIMULATED]
 * Simulates publishing and scheduling videos on target platforms (like YouTube).
 */
export class MockPublishingProvider implements IPublishingProvider {
  async publishVideo(
    videoFilePath: string,
    title: string,
    description: string,
    tags: string[]
  ): Promise<PublicationDetails> {
    logger.info(
      { videoFilePath, title, tagsCount: tags.length },
      '[MOCKED / SIMULATED] publishVideo initiated upload track'
    );

    const platformVideoId = `yt_sim_${Math.random().toString(36).substr(2, 9)}`;
    return {
      platformVideoId,
      publishUrl: `https://youtube.com/watch?v=${platformVideoId}`,
      metadata: { title, description, tags, publishedAt: new Date().toISOString() },
    };
  }

  async scheduleVideo(
    videoFilePath: string,
    title: string,
    description: string,
    tags: string[],
    publishAt: Date
  ): Promise<PublicationDetails> {
    logger.info(
      { videoFilePath, title, publishAt: publishAt.toISOString() },
      '[MOCKED / SIMULATED] scheduleVideo initiated calendar schedule'
    );

    const platformVideoId = `yt_sim_sched_${Math.random().toString(36).substr(2, 9)}`;
    return {
      platformVideoId,
      publishUrl: `https://youtube.com/watch?v=${platformVideoId}`,
      metadata: { title, description, tags, scheduledPublishAt: publishAt.toISOString() },
    };
  }

  getProviderName(): string {
    return 'MockPublishingProvider';
  }
}
export default MockPublishingProvider;
