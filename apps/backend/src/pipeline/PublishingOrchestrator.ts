import { prisma, JobStatus } from '@vexa/database';
import { IPublishingProvider, PublicationDetails } from '../providers/interfaces/IPublishingProvider.js';
import { logger } from '../utils/logger.js';

export class PublishingOrchestrator {
  constructor(private publishingProvider: IPublishingProvider) {}

  /**
   * Orchestrates video publication with strict database-backed idempotency protection.
   */
  async executePublishJob(
    idempotencyKey: string,
    correlationId: string,
    videoFilePath: string,
    title: string,
    description: string,
    tags: string[]
  ): Promise<{ success: boolean; jobStatus: JobStatus; details?: PublicationDetails; message?: string }> {
    logger.info({ idempotencyKey, correlationId, title }, 'Publishing Orchestrator checking idempotency locks');

    // 1. Check if a Job with this idempotency key already exists
    const existingJob = await prisma.job.findUnique({
      where: { idempotencyKey },
    });

    if (existingJob) {
      if (existingJob.status === 'COMPLETED') {
        logger.warn({ idempotencyKey }, 'Idempotency Protection Triggered: Job already completed successfully. Bypassing dual-publish.');
        return {
          success: true,
          jobStatus: 'COMPLETED',
          details: existingJob.result as any as PublicationDetails,
          message: 'Idempotent bypass: Video already published previously.',
        };
      }

      if (existingJob.status === 'RUNNING') {
        logger.warn({ idempotencyKey }, 'Idempotency Protection Triggered: Job is currently executing. Denying duplicate execution.');
        return {
          success: false,
          jobStatus: 'RUNNING',
          message: 'Idempotent lockout: This job is already actively processing in the worker queue.',
        };
      }
    }

    // 2. Register/Update the Job as RUNNING atomically
    let jobRecord;
    if (existingJob) {
      jobRecord = await prisma.job.update({
        where: { id: existingJob.id },
        data: { status: 'RUNNING', updatedAt: new Date() },
      });
    } else {
      jobRecord = await prisma.job.create({
        data: {
          correlationId,
          status: 'RUNNING',
          idempotencyKey,
          payload: { title, videoFilePath },
        },
      });
    }

    try {
      // 3. Invoke the isolated provider to publish the video
      const details = await this.publishingProvider.publishVideo(
        videoFilePath,
        title,
        description,
        tags
      );

      // 4. Update the Job status to COMPLETED atomically in the database
      await prisma.job.update({
        where: { id: jobRecord.id },
        data: {
          status: 'COMPLETED',
          result: details as any,
          updatedAt: new Date(),
        },
      });

      logger.info({ platformVideoId: details.platformVideoId }, 'Successfully completed publish job');
      return {
        success: true,
        jobStatus: 'COMPLETED',
        details,
      };
    } catch (error) {
      logger.error({ err: error, idempotencyKey }, 'Failed to publish video. Marking job as FAILED.');

      // Update Job status to FAILED in the database
      await prisma.job.update({
        where: { id: jobRecord.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown publishing error',
          updatedAt: new Date(),
        },
      });

      return {
        success: false,
        jobStatus: 'FAILED',
        message: 'Publishing execution crashed.',
      };
    }
  }
}
export default PublishingOrchestrator;
