import { Module, Global, OnModuleInit } from '@nestjs/common';
import { ConstructionBiController } from './construction-bi.controller';
import { ConstructionBiService } from './application/construction-bi.service';
import { ProjectDashboardReport } from './handlers/project-dashboard.report';
import { ReportHandlerRegistry } from '../reporting-engine/infrastructure/report-handler.registry';
import { ReportingEngineModule } from '../reporting-engine/reporting-engine.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule, ReportingEngineModule],
  controllers: [ConstructionBiController],
  providers: [ConstructionBiService, ProjectDashboardReport],
  exports: [ConstructionBiService],
})
export class ConstructionBiModule implements OnModuleInit {
  constructor(
    private readonly registry: ReportHandlerRegistry,
    private readonly dashboardReport: ProjectDashboardReport,
  ) {}

  onModuleInit() {
    this.registry.register(this.dashboardReport);
  }
}
