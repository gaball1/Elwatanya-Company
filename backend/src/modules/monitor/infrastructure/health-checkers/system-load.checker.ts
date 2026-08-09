import { Injectable } from '@nestjs/common';
import * as os from 'os';
import { HealthChecker } from './health-checker.interface';
import { ComponentHealth } from '../../domain/system-health.interface';

@Injectable()
export class SystemLoadChecker implements HealthChecker {
  readonly name = 'system';

  async check(): Promise<ComponentHealth> {
    const start = Date.now();
    const loadAvg = os.loadavg()[0];
    const cpuCount = os.cpus().length;
    const freeMem = os.freemem();
    const totalMem = os.totalmem();
    const memUsage = ((totalMem - freeMem) / totalMem) * 100;

    const status = loadAvg > cpuCount * 1.5 || memUsage > 90 ? 'degraded' : 'healthy';

    return {
      status,
      latency: Date.now() - start,
      message: `CPU: ${loadAvg.toFixed(2)}/${cpuCount}, Memory: ${memUsage.toFixed(1)}%`,
      lastChecked: new Date(),
    };
  }
}
