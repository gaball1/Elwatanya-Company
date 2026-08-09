import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { IQueue, JobOptions } from '../domain/queue.interface';
import { Job, JobType, JobStatus } from '../domain/job.interface';

@Injectable()
export class InMemoryQueue implements IQueue {
  private readonly logger = new Logger(InMemoryQueue.name);
  private jobs = new Map<string, Job>();
  private completedCallbacks: ((job: Job) => void)[] = [];
  private failedCallbacks: ((job: Job, error: Error) => void)[] = [];

  async add<T = any>(type: JobType, data: T, options?: JobOptions): Promise<Job<T>> {
    const job: Job<T> = {
      id: uuid(),
      type,
      data,
      status: JobStatus.PENDING,
      priority: options?.priority ?? 0,
      attempts: 0,
      maxAttempts: options?.maxAttempts ?? 3,
      delayUntil: options?.delay ? new Date(Date.now() + options.delay) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.jobs.set(job.id, job);
    this.logger.log(`Job ${job.id} (${type}) queued`);

    // Process synchronously for dev (in production BullMQ workers handle this)
    setImmediate(() => this.processJob(job.id));

    return job;
  }

  async getStatus(jobId: string): Promise<Job | null> {
    return this.jobs.get(jobId) ?? null;
  }

  async getFailed(): Promise<Job[]> {
    return Array.from(this.jobs.values()).filter((j) => j.status === JobStatus.FAILED);
  }

  async getPending(): Promise<Job[]> {
    return Array.from(this.jobs.values()).filter((j) => j.status === JobStatus.PENDING);
  }

  async cancel(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job && job.status === JobStatus.PENDING) {
      job.status = JobStatus.CANCELLED;
      job.updatedAt = new Date();
    }
  }

  onCompleted(callback: (job: Job) => void): void {
    this.completedCallbacks.push(callback);
  }

  onFailed(callback: (job: Job, error: Error) => void): void {
    this.failedCallbacks.push(callback);
  }

  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const delay = job.delayUntil ? job.delayUntil.getTime() - Date.now() : 0;
    if (delay > 0) {
      job.status = JobStatus.DELAYED;
      setTimeout(() => this.processJob(jobId), delay);
      return;
    }

    job.status = JobStatus.PROCESSING;
    job.updatedAt = new Date();

    try {
      const worker = this.workers.get(job.type);
      if (worker) {
        job.result = await worker(job.data);
      }
      job.status = JobStatus.COMPLETED;
      job.completedAt = new Date();
      job.updatedAt = new Date();
      this.logger.log(`Job ${job.id} (${job.type}) completed`);
      for (const cb of this.completedCallbacks) cb(job);
    } catch (err) {
      job.attempts = (job.attempts ?? 0) + 1;
      job.error = (err as Error).message;
      if (job.attempts < (job.maxAttempts ?? 3)) {
        this.logger.warn(`Job ${job.id} failed, retrying (${job.attempts}/${job.maxAttempts})`);
        setTimeout(() => this.processJob(jobId), 5000 * (job.attempts ?? 1));
      } else {
        job.status = JobStatus.FAILED;
        job.updatedAt = new Date();
        this.logger.error(`Job ${job.id} (${job.type}) failed after ${job.attempts} attempts: ${(err as Error).message}`);
        for (const cb of this.failedCallbacks) cb(job, err as Error);
      }
    }
  }

  private workers = new Map<string, (data: any) => Promise<any>>();

  registerWorker(type: JobType, handler: (data: any) => Promise<any>): void {
    this.workers.set(type, handler);
    this.logger.log(`Worker registered for ${type}`);
  }

  registerWorkers(workers: Record<string, (data: any) => Promise<any>>): void {
    for (const [type, handler] of Object.entries(workers)) {
      this.registerWorker(type as JobType, handler);
    }
  }
}
