import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { MonitorService } from './monitor.service';
import { MonitorController } from './monitor.controller';
import { DatabaseHealthChecker } from './infrastructure/health-checkers/database-health.checker';
import { SystemLoadChecker } from './infrastructure/health-checkers/system-load.checker';

@Module({
  imports: [PrismaModule],
  controllers: [MonitorController],
  providers: [
    MonitorService,
    DatabaseHealthChecker,
    SystemLoadChecker,
  ],
  exports: [MonitorService],
})
export class MonitorModule {
  constructor(
    private readonly monitor: MonitorService,
    private readonly dbChecker: DatabaseHealthChecker,
    private readonly sysChecker: SystemLoadChecker,
  ) {
    this.monitor.registerChecker(this.dbChecker);
    this.monitor.registerChecker(this.sysChecker);
  }
}
