import { prisma, Job, JobStatus } from '@vexa/database';
import { logger } from '../utils/logger.js';

export class DLQRouter {
  /**
   * Fetches all jobs isolated in the Dead Letter Queue.
   */
  static async getDLQJobs(): Promise<Job[]> {
    logger.info('Fetching isolated Dead Letter Queue jobs');
    return prisma.job.findMany({
      where: { status: 'DEAD_LETTER' },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Atomically isolates a failed job to the Dead Letter Queue.
   */
  static async routeToDLQ(jobId: string, errorReason: string): Promise<Job> {
    logger.warn({ jobId, errorReason }, 'Routing repeatedly failing job to DLQ');

    return prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'DEAD_LETTER',
        errorMessage: errorReason,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Requeues an isolated DLQ job back into the execution queue.
   * Resets retry count and updates status atomically.
   */
  static async requeueJob(jobId: string): Promise<Job> {
    logger.info({ jobId }, 'Requeuing job from Dead Letter Queue');

    return prisma.job.update({
      where: { id: jobId, status: 'DEAD_LETTER' },
      data: {
        status: 'QUEUED',
        retryCount: 0,
        errorMessage: null,
        updatedAt: new Date(),
      },
    });
  }
}
export default DLQRouter;
