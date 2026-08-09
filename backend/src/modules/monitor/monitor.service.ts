import { Injectable, Logger } from '@nestjs/common';
import { SystemHealth, SystemMetrics } from './domain/system-health.interface';
import { HealthChecker } from './infrastructure/health-checkers/health-checker.interface';

@Injectable()
export class MonitorService {
  private readonly logger = new Logger(MonitorService.name);
  private checkers: HealthChecker[] = [];
  private requestCount = 0;
  private errorCount = 0;
  private totalLatency = 0;
  private startTime = Date.now();

  registerChecker(checker: HealthChecker): void {
    this.checkers.push(checker);
    this.logger.log(`Health checker registered: ${checker.name}`);
  }

  async health(): Promise<SystemHealth> {
    const components: Record<string, any> = {};

    for (const checker of this.checkers) {
      try {
        components[checker.name] = await checker.check();
      } catch {
        components[checker.name] = {
          status: 'down',
          latency: 0,
          message: 'Checker threw exception',
          lastChecked: new Date(),
        };
      }
    }

    const hasDown = Object.values(components).some((c: any) => c.status === 'down');
    const hasDegraded = Object.values(components).some((c: any) => c.status === 'degraded');

    return {
      status: hasDown ? 'down' : hasDegraded ? 'degraded' : 'healthy',
      components,
      uptime: Date.now() - this.startTime,
      lastChecked: new Date(),
    };
  }

  async getMetrics(): Promise<SystemMetrics> {
    const health = await this.health();
    const failedJobs = Object.values(health.components).filter((c: any) => c.status === 'down').length;

    return {
      activeUsers: 0,
      totalRequests: this.requestCount,
      errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
      avgResponseTime: this.requestCount > 0 ? Math.round(this.totalLatency / this.requestCount) : 0,
      queueDepth: 0,
      failedJobs,
      storageUsed: 0,
      databaseConnections: 0,
    };
  }

  recordRequest(latency: number, isError: boolean): void {
    this.requestCount++;
    this.totalLatency += latency;
    if (isError) this.errorCount++;
  }
}
