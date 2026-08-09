import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { HealthChecker } from './health-checker.interface';
import { ComponentHealth } from '../../domain/system-health.interface';

@Injectable()
export class DatabaseHealthChecker implements HealthChecker {
  readonly name = 'database';

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'healthy',
        latency: Date.now() - start,
        lastChecked: new Date(),
      };
    } catch {
      return {
        status: 'down',
        latency: Date.now() - start,
        message: 'Database connection failed',
        lastChecked: new Date(),
      };
    }
  }
}
