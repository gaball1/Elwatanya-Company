import { Module, NestModule, MiddlewareConsumer, RequestMethod, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import * as helmet from "helmet";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { HealthModule } from "./health/health.module";
import { validateConfig } from "./common/config/config-validation";
import { ProjectModule } from "./modules/project/project.module";
import { BuildingModule } from "./modules/building/building.module";
import { BuildingSubcontractorModule } from "./modules/building-subcontractor/building-subcontractor.module";
import { EmployerBoqModule } from "./modules/employer-boq/employer-boq.module";
import { AnalyticalBoqModule } from "./modules/analytical-boq/analytical-boq.module";
import { FinalBoqModule } from "./modules/final-boq/final-boq.module";
import { SubcontractorModule } from "./modules/subcontractor/subcontractor.module";
import { ContractorBoqModule } from "./modules/contractor-boq/contractor-boq.module";
import { DistributionModule } from "./modules/distribution/distribution.module";
import { ExtractModule } from "./modules/extract/extract.module";
import { PaymentModule } from "./modules/payment/payment.module";
import { ClientModule } from "./modules/client/client.module";
import { SupplierModule } from "./modules/supplier/supplier.module";
import { RoleModule } from "./modules/role/role.module";
import { DepartmentModule } from "./modules/department/department.module";
import { EmployeeModule } from "./modules/employee/employee.module";
import { AttendanceModule } from "./modules/attendance/attendance.module";
import { AttendanceOverrideModule } from "./modules/attendance-override/attendance-override.module";
import { LeaveModule } from "./modules/leave/leave.module";
import { HolidayModule } from "./modules/holiday/holiday.module";
import { ApprovalModule } from "./modules/approval/approval.module";
import { WarehouseModule } from "./modules/warehouse/warehouse.module";
import { CategoryModule } from "./modules/category/category.module";
import { InventoryItemModule } from "./modules/inventory-item/inventory-item.module";
import { StockMovementModule } from "./modules/stock-movement/stock-movement.module";
import { ProjectFundModule } from "./modules/project-fund/project-fund.module";
import { FundTransactionModule } from "./modules/fund-transaction/fund-transaction.module";
import { MiscellaneousModule } from "./modules/miscellaneous/miscellaneous.module";
import { NotificationModule } from "./modules/notification/notification.module";
import { ProjectBoardModule } from "./modules/project-board/project-board.module";
import { ClientStatementModule } from "./modules/client-statement/client-statement.module";
import { SubcontractorStatementModule } from "./modules/subcontractor-statement/subcontractor-statement.module";
import { PurchaseModule } from "./modules/purchase/purchase.module";
import { FinancialService } from "./common/services/financial.service";
import { NotificationService } from "./common/services/notification.service";
import { AuditModule } from "./modules/audit/audit.module";
import { RecycleBinModule } from "./modules/recycle-bin/recycle-bin.module";
import { AdminUsersModule } from "./modules/admin-users/admin-users.module";
import { PermissionsModule } from "./modules/permissions/permissions.module";
import { ProfileModule } from "./modules/profile/profile.module";
import { ShiftModule } from "./modules/shift/shift.module";
import { AiAgentModule } from "./modules/ai-agent/ai-agent.module";
import { CompanyModule } from "./modules/company/company.module";
import { DocumentEngineModule } from "./modules/document-engine/document-engine.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { WhiteLabelModule } from "./modules/white-label/white-label.module";
import { DomainEventsModule } from "./modules/domain-events/domain-events.module";
import { FileModule } from "./modules/file/file.module";
import { SetupWizardModule } from "./modules/setup-wizard/setup-wizard.module";
import { TimelineModule } from "./modules/timeline/timeline.module";
import { QueueModule } from "./modules/queue/queue.module";
import { SchedulerModule } from "./modules/scheduler/scheduler.module";
import { NotificationEngineModule } from "./modules/notification-engine/notification-engine.module";
import { SearchEngineModule } from "./modules/search-engine/search-engine.module";
import { MonitorModule } from "./modules/monitor/monitor.module";
import { ImportExportModule } from "./modules/import-export/import-export.module";
import { PdfEngineModule } from "./modules/pdf-engine/pdf-engine.module";
import { ConstructionBiModule } from "./modules/construction-bi/construction-bi.module";
import { ConstructionAnalyticsModule } from "./modules/construction-analytics/construction-analytics.module";
import { DocumentNumberModule } from "./modules/document-number/document-number.module";
import { SignatureWorkflowModule } from "./modules/signature-workflow/signature-workflow.module";
import { ReportingEngineModule } from "./modules/reporting-engine/reporting-engine.module";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { AuditInterceptor } from "./common/interceptors/audit.interceptor";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { PermissionGuard } from "./common/guards/permission.guard";
import { CorrelationIdMiddleware } from "./common/middleware/correlation-id.middleware";
import { LoggerModule } from "nestjs-pino";
@Global()
@Module({
  imports: [
    LoggerModule.forRoot(),

    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../.env"],
      validate: validateConfig,
    }),

    ThrottlerModule.forRoot([{
      ttl: 60000,
      // Raised so the AI agent's composed workflows (which make many read
      // calls per conversation turn) do not trip the per-IP limit.
      limit: 300,
    }]),

    PrismaModule,
    AuthModule,
    PurchaseModule,
    UsersModule,
    HealthModule,
    ProjectModule,
    BuildingModule,
    BuildingSubcontractorModule,
    EmployerBoqModule,
    AnalyticalBoqModule,
    FinalBoqModule,
    SubcontractorModule,
    ContractorBoqModule,
    DistributionModule,
    ExtractModule,
    PaymentModule,
    ClientModule,
    SupplierModule,
    RoleModule,
    DepartmentModule,
    EmployeeModule,
    AttendanceModule,
    AttendanceOverrideModule,
    LeaveModule,
    HolidayModule,
    ApprovalModule,
    WarehouseModule,
    CategoryModule,
    InventoryItemModule,
    StockMovementModule,
    ProjectFundModule,
    FundTransactionModule,
    MiscellaneousModule,
    NotificationModule,
    ProjectBoardModule,
    ClientStatementModule,
    SubcontractorStatementModule,
    AuditModule,
    RecycleBinModule,
    AdminUsersModule,
    PermissionsModule,
    ProfileModule,
    ShiftModule,
    AiAgentModule,
    CompanyModule,
    DocumentEngineModule,
    SettingsModule,
    WhiteLabelModule,
    DomainEventsModule,
    FileModule,
    SetupWizardModule,
    TimelineModule,
    QueueModule,
    SchedulerModule,
    NotificationEngineModule,
    SearchEngineModule,
    MonitorModule,
    ImportExportModule,
    PdfEngineModule,
    ConstructionBiModule,
    ConstructionAnalyticsModule,
    DocumentNumberModule,
    SignatureWorkflowModule,
    ReportingEngineModule,
  ],
  providers: [
    FinancialService,
    NotificationService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [FinancialService, NotificationService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware, (helmet.default ?? helmet)()).forRoutes('*');
  }
}
