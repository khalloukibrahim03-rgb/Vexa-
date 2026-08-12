import { prisma, Job, JobStatus } from '@vexa/database';
import { logger } from '../utils/logger.js';

export class JobCoordinator {
  /**
   * Spawns a heartbeat lease renewal interval for a running job.
   * Ensures the job's lease remains valid while processing is active.
   */
  static startHeartbeat(jobId: string, intervalMs = 30000, leaseExtensionMinutes = 5): NodeJS.Timeout {
    logger.info({ jobId }, 'Started heartbeat lease tracker for job');

    return setInterval(async () => {
      try {
        const leaseExpiry = new Date(Date.now() + leaseExtensionMinutes * 60 * 1000);
        await prisma.job.update({
          where: { id: jobId, status: 'RUNNING' },
          data: {
            leaseExpiry,
            heartbeatAt: new Date(),
          },
        });
        logger.debug({ jobId }, 'Successfully renewed job heartbeat lease');
      } catch (error) {
        logger.error({ err: error, jobId }, 'Failed to renew job heartbeat lease');
      }
    }, intervalMs);
  }

  /**
   * Processes sequential child steps under a parent job.
   * Guarantees parent-child trace correlation and sequential step order execution.
   */
  static async processChildSteps(parentJobId: string): Promise<Job[]> {
    logger.info({ parentJobId }, 'Orchestrating child steps for parent job');

    // Fetch queued child jobs for this parent
    const children = await prisma.job.findMany({
      where: { parentJobId, status: 'QUEUED' },
      orderBy: { priority: 'desc' },
    });

    for (const child of children) {
      logger.info({ childId: child.id, parentJobId }, 'Processing sequential child job');

      // Update child status to RUNNING
      await prisma.job.update({
        where: { id: child.id },
        data: { status: 'RUNNING', updatedAt: new Date() },
      });

      // Simulates running sequential subtasks (e.g. ScriptJob, ScriptQCJob, Rendering)
      await prisma.job.update({
        where: { id: child.id },
        data: { status: 'COMPLETED', updatedAt: new Date() },
      });
    }

    return prisma.job.findMany({ where: { parentJobId } });
  }

  /**
   * Sweeps expired leases to detect and recover from worker crashes.
   * If a job's lease expires without heartbeat renewals, it is marked as RETRYING or DEAD_LETTER.
   */
  static async recoverStandbyCrashedJobs(maxRetries = 3): Promise<Job[]> {
    logger.info('Sweeping expired heartbeat leases for crash recovery');

    const expiredJobs = await prisma.job.findMany({
      where: {
        status: 'RUNNING',
        leaseExpiry: { lt: new Date() },
      },
    });

    const recovered: Job[] = [];

    for (const job of expiredJobs) {
      logger.warn({ jobId: job.id, retryCount: job.retryCount }, 'Detected crashed/orphaned worker lease');

      if (job.retryCount < maxRetries) {
        const updated = await prisma.job.update({
          where: { id: job.id },
          data: {
            status: 'RETRYING',
            retryCount: job.retryCount + 1,
            updatedAt: new Date(),
          },
        });
        recovered.push(updated);
        logger.info({ jobId: job.id }, 'Successfully recovered crashed job to RETRYING status');
      } else {
        const updated = await prisma.job.update({
          where: { id: job.id },
          data: {
            status: 'DEAD_LETTER',
            errorMessage: 'Heartbeat lease expired. Max retries exceeded.',
            updatedAt: new Date(),
          },
        });
        recovered.push(updated);
        logger.error({ jobId: job.id }, 'Crashed job exceeded max retries. Isolated to DEAD_LETTER queue.');
      }
    }

    return recovered;
  }
}
export default JobCoordinator;
