import { JobStatus } from '@vexa/database';

export interface QueueJobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
}

export interface IQueueProvider {
  /**
   * Adds a new job to the queue system
   */
  addJob<T = any>(
    name: string,
    payload: T,
    options?: QueueJobOptions
  ): Promise<{ id: string; name: string; status: JobStatus }>;

  /**
   * Fetches a job from the queue system by its ID
   */
  getJob(id: string): Promise<any | null>;

  /**
   * Cancels/removes a job from the queue
   */
  cancelJob(id: string): Promise<boolean>;
}
