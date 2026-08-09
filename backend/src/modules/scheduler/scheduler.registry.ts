import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry as NestSchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ScheduledJob } from './domain/scheduled-job.interface';

@Injectable()
export class SchedulerRegistryImpl {
  private readonly logger = new Logger(SchedulerRegistryImpl.name);
  private jobs = new Map<string, ScheduledJob>();

  constructor(private readonly nestRegistry: NestSchedulerRegistry) {}

  register(job: ScheduledJob): void {
    this.jobs.set(job.name, job);
    if (job.enabled) {
      const cronJob = new CronJob(job.cronExpression, async () => {
        this.logger.log(`Executing scheduled job: ${job.name}`);
        try {
          await job.execute();
        } catch (err) {
          this.logger.error(`Scheduled job ${job.name} failed: ${(err as Error).message}`);
        }
      });
      this.nestRegistry.addCronJob(job.name, cronJob);
      cronJob.start();
      this.logger.log(`Scheduled job '${job.name}' registered: ${job.cronExpression}`);
    }
  }

  getJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values());
  }

  getJob(name: string): ScheduledJob | undefined {
    return this.jobs.get(name);
  }
}
