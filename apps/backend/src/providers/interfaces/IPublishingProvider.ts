export interface PublicationDetails {
  platformVideoId: string;
  publishUrl: string;
  metadata: Record<string, any>;
}

export interface IPublishingProvider {
  /**
   * Publishes a video file to the social/video platform with title, description, and tags.
   */
  publishVideo(
    videoFilePath: string,
    title: string,
    description: string,
    tags: string[]
  ): Promise<PublicationDetails>;

  /**
   * Schedules a video file to be published at a specific future timestamp.
   */
  scheduleVideo(
    videoFilePath: string,
    title: string,
    description: string,
    tags: string[],
    publishAt: Date
  ): Promise<PublicationDetails>;

  /**
   * Returns the provider name.
   */
  getProviderName(): string;
}
