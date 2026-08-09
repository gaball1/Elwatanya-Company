import { Module, OnModuleInit } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PdfEngineModule } from '../pdf-engine/pdf-engine.module';
import { DocumentEngineController } from './document-engine.controller';
import { DocumentVerificationController } from './document-verification.controller';
import { DocumentEngineService } from './document-engine.service';
import { TemplateEngineService } from './template-engine.service';
import { TemplateRegistry } from './templates/template.registry';
import { EmployerBoqTemplate } from './templates/employer-boq.template';
import { AnalyticalBoqTemplate } from './templates/analytical-boq.template';
import { FinalBoqTemplate } from './templates/final-boq.template';
import { ContractorBoqTemplate } from './templates/contractor-boq.template';
import { ContractorExtractTemplate } from './templates/contractor-extract.template';
import { ClientStatementTemplate } from './templates/client-statement.template';
import { SubcontractorStatementTemplate } from './templates/subcontractor-statement.template';
import { PurchaseOrderTemplate } from './templates/purchase-order.template';
import { PaymentVoucherTemplate } from './templates/payment-voucher.template';
import { TreasuryReportTemplate } from './templates/treasury-report.template';
import { InventoryReportTemplate } from './templates/inventory-report.template';
import { AttendanceReportTemplate } from './templates/attendance-report.template';
import { PayrollReportTemplate } from './templates/payroll-report.template';
import { ProjectProgressTemplate } from './templates/project-progress.template';
import { FinancialReportTemplate } from './templates/financial-report.template';
import { ExecutiveReportTemplate } from './templates/executive-report.template';
import { ContractorPerformanceTemplate } from './templates/contractor-performance.template';
import { BoqAnalysisTemplate } from './templates/boq-analysis.template';

@Module({
  imports: [PrismaModule, PdfEngineModule],
  controllers: [DocumentEngineController, DocumentVerificationController],
  providers: [
    DocumentEngineService,
    TemplateEngineService,
    TemplateRegistry,
    EmployerBoqTemplate,
    AnalyticalBoqTemplate,
    FinalBoqTemplate,
    ContractorBoqTemplate,
    ContractorExtractTemplate,
    ClientStatementTemplate,
    SubcontractorStatementTemplate,
    PurchaseOrderTemplate,
    PaymentVoucherTemplate,
    TreasuryReportTemplate,
    InventoryReportTemplate,
    AttendanceReportTemplate,
    PayrollReportTemplate,
    ProjectProgressTemplate,
    FinancialReportTemplate,
    ExecutiveReportTemplate,
    ContractorPerformanceTemplate,
    BoqAnalysisTemplate,
  ],
  exports: [DocumentEngineService, TemplateEngineService, TemplateRegistry],
})
export class DocumentEngineModule implements OnModuleInit {
  constructor(
    private readonly registry: TemplateRegistry,
    private readonly employerBoq: EmployerBoqTemplate,
    private readonly analyticalBoq: AnalyticalBoqTemplate,
    private readonly finalBoq: FinalBoqTemplate,
    private readonly contractorBoq: ContractorBoqTemplate,
    private readonly contractorExtract: ContractorExtractTemplate,
    private readonly clientStatement: ClientStatementTemplate,
    private readonly subcontractorStatement: SubcontractorStatementTemplate,
    private readonly purchaseOrder: PurchaseOrderTemplate,
    private readonly paymentVoucher: PaymentVoucherTemplate,
    private readonly treasuryReport: TreasuryReportTemplate,
    private readonly inventoryReport: InventoryReportTemplate,
    private readonly attendanceReport: AttendanceReportTemplate,
    private readonly payrollReport: PayrollReportTemplate,
    private readonly projectProgress: ProjectProgressTemplate,
    private readonly financialReport: FinancialReportTemplate,
    private readonly executiveReport: ExecutiveReportTemplate,
    private readonly contractorPerformance: ContractorPerformanceTemplate,
    private readonly boqAnalysis: BoqAnalysisTemplate,
  ) {}

  onModuleInit() {
    this.registry.register(this.employerBoq);
    this.registry.register(this.analyticalBoq);
    this.registry.register(this.finalBoq);
    this.registry.register(this.contractorBoq);
    this.registry.register(this.contractorExtract);
    this.registry.register(this.clientStatement);
    this.registry.register(this.subcontractorStatement);
    this.registry.register(this.purchaseOrder);
    this.registry.register(this.paymentVoucher);
    this.registry.register(this.treasuryReport);
    this.registry.register(this.inventoryReport);
    this.registry.register(this.attendanceReport);
    this.registry.register(this.payrollReport);
    this.registry.register(this.projectProgress);
    this.registry.register(this.financialReport);
    this.registry.register(this.executiveReport);
    this.registry.register(this.contractorPerformance);
    this.registry.register(this.boqAnalysis);
  }
}
