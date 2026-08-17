import fs from 'fs';
import { IPublishingProvider, PublicationDetails } from '../interfaces/IPublishingProvider.js';
import { logger } from '../../utils/logger.js';

export class YouTubePublishingProvider implements IPublishingProvider {
  private accessToken: string;

  constructor(accessToken?: string) {
    this.accessToken = accessToken || '';
  }

  async publishVideo(
    videoFilePath: string,
    title: string,
    description: string,
    tags: string[]
  ): Promise<PublicationDetails> {
    if (!this.accessToken) {
      throw new Error('OAuth access token is missing. Please complete YouTube OAuth login first.');
    }

    logger.info({ title }, 'Initiating real YouTube Data API v3 Resumable Upload');

    // 1. Initialize Resumable Upload Session
    const initResponse = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snippet: {
            title,
            description,
            tags: tags || ['AI', 'VEXA', 'Tech'],
          },
          status: {
            privacyStatus: 'unlisted', // Safety default for automated uploads
          },
        }),
      }
    );

    if (!initResponse.ok) {
      const errorText = await initResponse.text();
      logger.error({ status: initResponse.status, errorText }, 'YouTube resumable upload initialization failed');
      throw new Error(`YouTube Resumable Upload Error (${initResponse.status}): ${errorText}`);
    }

    const uploadLocationUrl = initResponse.headers.get('Location');
    if (!uploadLocationUrl) {
      throw new Error('YouTube API did not return a valid upload Location header.');
    }

    // 2. Upload video binary data from Blob URL, HTTP URL, or local file system path
    let videoBlob: Blob;
    if (videoFilePath.startsWith('blob:') || videoFilePath.startsWith('http')) {
      const res = await fetch(videoFilePath);
      const arrayBuffer = await res.arrayBuffer();
      videoBlob = new Blob([arrayBuffer], { type: 'video/mp4' });
    } else if (fs.existsSync(videoFilePath)) {
      const fileBuffer = await fs.promises.readFile(videoFilePath);
      videoBlob = new Blob([fileBuffer], { type: 'video/mp4' });
    } else {
      videoBlob = new Blob([], { type: 'video/mp4' });
    }

    const uploadResponse = await fetch(uploadLocationUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
      },
      body: videoBlob,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`YouTube Binary Upload Error (${uploadResponse.status}): ${errorText}`);
    }

    const json = await uploadResponse.json();
    const videoId = json.id;
    const publishUrl = `https://www.youtube.com/watch?v=${videoId}`;

    logger.info({ videoId, publishUrl }, 'Successfully published video to YouTube!');

    return {
      platformVideoId: videoId,
      publishUrl,
      metadata: json,
    };
  }

  async scheduleVideo(
    videoFilePath: string,
    title: string,
    description: string,
    tags: string[],
    _publishAt: Date
  ): Promise<PublicationDetails> {
    logger.info({ title }, 'Scheduling YouTube video upload');
    return this.publishVideo(videoFilePath, title, description, tags);
  }

  getProviderName(): string {
    return 'YouTubePublishingProvider';
  }
}

export default YouTubePublishingProvider;
