export interface ScheduledJob {
  name: string;
  cronExpression: string;
  description: string;
  enabled: boolean;
  execute(): Promise<void>;
}

export interface SchedulerRegistry {
  register(job: ScheduledJob): void;
  getJobs(): ScheduledJob[];
  getJob(name: string): ScheduledJob | undefined;
}
