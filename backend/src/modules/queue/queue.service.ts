import { Injectable } from '@nestjs/common';
import { InMemoryQueue } from './infrastructure/in-memory-queue';
import { JobType, Job } from './domain/job.interface';
import { JobOptions } from './domain/queue.interface';

@Injectable()
export class QueueService {
  constructor(private readonly queue: InMemoryQueue) {}

  async add<T = any>(type: JobType, data: T, options?: JobOptions): Promise<Job<T>> {
    return this.queue.add(type, data, options);
  }

  async getStatus(jobId: string): Promise<Job | null> {
    return this.queue.getStatus(jobId);
  }

  async getFailed(): Promise<Job[]> {
    return this.queue.getFailed();
  }

  async cancel(jobId: string): Promise<void> {
    return this.queue.cancel(jobId);
  }
}
