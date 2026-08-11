export interface WorkerProcessResult {
  success: boolean;
  result?: any;
  error?: {
    message: string;
    stack?: string;
  };
}

export interface IWorkerProvider {
  /**
   * Registers a processor function for jobs under a specific queue name
   */
  registerProcessor(
    queueName: string,
    processor: (job: { id: string; payload: any }) => Promise<WorkerProcessResult>
  ): void;

  /**
   * Starts polling and processing jobs
   */
  start(): Promise<void>;

  /**
   * Safely stops the worker instance
   */
  shutdown(): Promise<void>;
}
