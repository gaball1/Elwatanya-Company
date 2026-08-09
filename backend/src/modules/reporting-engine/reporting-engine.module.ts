import { Module, OnModuleInit, Global } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ReportingEngineController } from './reporting-engine.controller';
import { ReportingEngineService } from './application/reporting-engine.service';
import { ReportHandlerRegistry } from './infrastructure/report-handler.registry';
import { CsvFormatProvider } from './infrastructure/formats/csv-format.service';
import { PdfFormatProvider } from './infrastructure/formats/pdf-format.service';
import { ExcelFormatProvider } from './infrastructure/formats/excel-format.service';
import { ProjectListReport } from './handlers/project-list.report';
import { PurchasesReport } from './handlers/purchases-report';
import { ProjectFundsReport } from './handlers/project-funds-report';

@Global()
@Module({
  controllers: [ReportingEngineController],
  providers: [
    ReportingEngineService,
    ReportHandlerRegistry,
    CsvFormatProvider,
    PdfFormatProvider,
    ExcelFormatProvider,
    ProjectListReport,
    PurchasesReport,
    ProjectFundsReport,
  ],
  exports: [
    ReportingEngineService,
    ReportHandlerRegistry,
  ],
})
export class ReportingEngineModule implements OnModuleInit {
  constructor(
    private readonly service: ReportingEngineService,
    private readonly registry: ReportHandlerRegistry,
    private readonly csv: CsvFormatProvider,
    private readonly pdf: PdfFormatProvider,
    private readonly excel: ExcelFormatProvider,
    private readonly projectList: ProjectListReport,
    private readonly purchases: PurchasesReport,
    private readonly projectFunds: ProjectFundsReport,
  ) {}

  onModuleInit() {
    this.service.registerFormatProvider(this.csv);
    this.service.registerFormatProvider(this.pdf);
    this.service.registerFormatProvider(this.excel);
    this.registry.register(this.projectList);
    this.registry.register(this.purchases);
    this.registry.register(this.projectFunds);
  }
}
