import { Job, JobType } from './job.interface';

export interface IQueue {
  add<T = any>(type: JobType, data: T, options?: JobOptions): Promise<Job<T>>;
  getStatus(jobId: string): Promise<Job | null>;
  getFailed(): Promise<Job[]>;
  getPending(): Promise<Job[]>;
  cancel(jobId: string): Promise<void>;
  onCompleted(callback: (job: Job) => void): void;
  onFailed(callback: (job: Job, error: Error) => void): void;
}

export interface JobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  maxAttempts?: number;
}
