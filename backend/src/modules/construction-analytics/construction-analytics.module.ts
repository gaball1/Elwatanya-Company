import { Module, Global, OnModuleInit } from '@nestjs/common';
import { ConstructionAnalyticsController } from './construction-analytics.controller';
import { AnalyticsDataService } from './application/analytics-data.service';
import { AnalyticsService } from './application/analytics.service';
import { AnalyticsCacheService } from './infrastructure/analytics-cache.service';
import { ProjectAnalyticsReport } from './handlers/project-analytics.report';
import { AttendanceReport } from './handlers/attendance-report';
import { ReportHandlerRegistry } from '../reporting-engine/infrastructure/report-handler.registry';
import { ReportingEngineModule } from '../reporting-engine/reporting-engine.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule, ReportingEngineModule],
  controllers: [ConstructionAnalyticsController],
  providers: [AnalyticsDataService, AnalyticsService, AnalyticsCacheService, ProjectAnalyticsReport, AttendanceReport],
  exports: [AnalyticsService, AnalyticsCacheService],
})
export class ConstructionAnalyticsModule implements OnModuleInit {
  constructor(
    private readonly registry: ReportHandlerRegistry,
    private readonly report: ProjectAnalyticsReport,
    private readonly attendanceReport: AttendanceReport,
  ) {}

  onModuleInit() {
    this.registry.register(this.report);
    this.registry.register(this.attendanceReport);
  }
}
