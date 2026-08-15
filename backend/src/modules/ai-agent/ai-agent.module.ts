import { Module, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '@/prisma/prisma.module';
import { AiAgentController } from './ai-agent.controller';
import { AiAgentService } from './ai-agent.service';
import { PlannerService } from './planner/planner.service';
import { ToolRegistryService } from './tools/tool-registry.service';
import { AgentHttpClient } from './tools/http-client';
import { ContextEngineService } from './context/context-engine.service';
import { ConversationMemoryService } from './memory/conversation-memory.service';
import { PermissionCheckerService } from './permissions/permission-checker.service';
import { ErpKnowledgeService } from './knowledge/erp-knowledge.service';
import { WorkflowRegistryService } from './workflows/workflow-registry.service';
import { ChainExecutorService } from './chaining/chain-executor.service';
import { SelfEvaluationService } from './evaluation/self-evaluation.service';
import { ConversationService } from './nl/conversation.service';
import { AgentAnalyticsService } from './analytics/agent-analytics.service';
import { BaseTool } from './tools/base.tool';
import { BaseWorkflow } from './workflows/base.workflow';
import { LlmConfigService } from './llm/llm-config.service';
import { LlmProviderService } from './llm/llm-provider.service';
import { AgentPromptBuilder } from './llm/agent-prompt.builder';
import { LlmAgentService } from './llm/llm-agent.service';

// Tool imports
import { ListProjectsTool, GetProjectTool, CreateProjectTool, UpdateProjectTool } from './tools/project.tools';
import { ListBuildingsTool, GetBuildingTool, CreateBuildingTool, UpdateBuildingTool } from './tools/building.tools';
import { ListPendingApprovalsTool, ApproveRequestTool, RejectRequestTool, CreateApprovalTool } from './tools/approval.tools';
import { ListEmployeesTool, GetEmployeeTool, CreateEmployeeTool, UpdateEmployeeTool, ListAttendanceTool } from './tools/employee.tools';
import { ListProjectFundsTool, ListFundTransactionsTool, ListPurchasesTool, CreatePurchaseTool, CreateProjectFundTool, CreateFundTransactionTool, UpdatePurchaseTool, ListPaymentsTool } from './tools/financial.tools';
import { ListWarehousesTool, ListInventoryItemsTool, CreateInventoryItemTool } from './tools/inventory.tools';
import { ListSuppliersTool, CreateSupplierTool, ListClientsTool, CreateClientTool } from './tools/supplier-client.tools';
import { ListSubcontractorsTool, CreateSubcontractorTool, AssignSubcontractorTool, CreateExtractTool, ListExtractsTool } from './tools/subcontractor.tools';
import { ProjectSummaryTool, EmployeeStatsTool, PendingApprovalsSummaryTool, FundSummaryTool, InventorySummaryTool } from './tools/analysis.tools';
import { CreateNotificationTool } from './tools/notification.tools';
import { SearchKnowledgeTool } from './tools/knowledge.tools';
import { GetEntityTimelineTool, GetEntityLifecycleTool } from './tools/timeline.tools';
import { GlobalSearchTool } from './tools/search.tools';
import { GetSettingsTool, UpdateSettingsTool } from './tools/settings.tools';
import { GetCompanySettingsTool, UpdateCompanySettingsTool } from './tools/company.tools';
import { GetEmployerBOQTool, GetAnalyticalBOQTool, GetFinalBOQTool, GetContractorBOQTool } from './tools/boq.tools';
import { GetKPITool, GetTrendsTool, GetComparisonTool, GetForecastTool } from './tools/bi.tools';
import { GetWhiteLabelBrandingTool, UpdateWhiteLabelBrandingTool } from './tools/white-label.tools';
import { ListReportsTool, GenerateReportTool } from './tools/reporting.tools';
import { RenderPdfTool } from './tools/pdf.tools';
import { ListSignatureWorkflowsTool, CreateSignatureWorkflowTool, SubmitForSignatureTool, SignDocumentTool, GetSignatureStatusTool } from './tools/signature.tools';
import { EvaluateAllKpisTool } from './tools/construction-bi.tools';
import {
  GetProjectDashboardTool,
  GetProjectSummaryTool,
  GetProjectProfitabilityTool,
  GetProjectRisksTool,
  GetProjectProgressTool,
  GetContractorAnalysisTool,
  GetBoqAnalysisTool,
  GetCashflowTool,
  GetInventoryAnalysisTool,
  GetEmployeeAnalysisTool,
  GetAttendanceAnalysisTool,
  GetExecutiveDashboardTool,
} from './tools/analytics.tools';
import {
  FindProjectTool,
  ListProjectBuildingsTool,
  FindBuildingTool,
  FindContractorTool,
  FindExtractTool,
  ListContractorExtractsTool,
  ListExtractPaymentsTool,
  ListExtractApprovalsTool,
  GetContractorDuesTool,
} from './tools/erp-resolution.tools';
import { ExecutiveReportService } from './executive/executive-report.service';

// Workflow imports
import { CreateProjectWorkflow } from './workflows/create-project.workflow';
import { EmployeeOnboardingWorkflow } from './workflows/employee-onboarding.workflow';
import { PurchaseOrderWorkflow } from './workflows/purchase-order.workflow';
import { ApprovalProcessWorkflow } from './workflows/approval-process.workflow';
import { ContractorOnboardingWorkflow } from './workflows/contractor-onboarding.workflow';
import { ExtractWorkflow } from './workflows/extract-workflow.workflow';
import { KnowledgeFusionWorkflow } from './workflows/knowledge-fusion.workflow';
import { ContractorPaymentAnalysisWorkflow } from './workflows/contractor-payment-analysis.workflow';

const ALL_TOOLS = [
  ListProjectsTool, GetProjectTool, CreateProjectTool, UpdateProjectTool,
  ListBuildingsTool, GetBuildingTool, CreateBuildingTool, UpdateBuildingTool,
  ListPendingApprovalsTool, ApproveRequestTool, RejectRequestTool, CreateApprovalTool,
  ListEmployeesTool, GetEmployeeTool, CreateEmployeeTool, UpdateEmployeeTool, ListAttendanceTool,
  ListProjectFundsTool, ListFundTransactionsTool, ListPurchasesTool, CreatePurchaseTool, CreateProjectFundTool, CreateFundTransactionTool, UpdatePurchaseTool, ListPaymentsTool,
  ListWarehousesTool, ListInventoryItemsTool, CreateInventoryItemTool,
  ListSuppliersTool, CreateSupplierTool, ListClientsTool, CreateClientTool,
  ListSubcontractorsTool, CreateSubcontractorTool, AssignSubcontractorTool, CreateExtractTool, ListExtractsTool,
  ProjectSummaryTool, EmployeeStatsTool, PendingApprovalsSummaryTool, FundSummaryTool, InventorySummaryTool,
  CreateNotificationTool,
  SearchKnowledgeTool,
  GetEntityTimelineTool, GetEntityLifecycleTool,
  GlobalSearchTool,
  GetSettingsTool, UpdateSettingsTool,
  GetCompanySettingsTool, UpdateCompanySettingsTool,
  GetEmployerBOQTool, GetAnalyticalBOQTool, GetFinalBOQTool, GetContractorBOQTool,
  GetKPITool, GetTrendsTool, GetComparisonTool, GetForecastTool,
  GetWhiteLabelBrandingTool, UpdateWhiteLabelBrandingTool,
  ListReportsTool, GenerateReportTool,
  RenderPdfTool,
  ListSignatureWorkflowsTool, CreateSignatureWorkflowTool, SubmitForSignatureTool, SignDocumentTool, GetSignatureStatusTool,
  EvaluateAllKpisTool,
  GetProjectDashboardTool, GetProjectSummaryTool, GetProjectProfitabilityTool, GetProjectRisksTool, GetProjectProgressTool,
  GetContractorAnalysisTool, GetBoqAnalysisTool, GetCashflowTool, GetInventoryAnalysisTool, GetEmployeeAnalysisTool, GetAttendanceAnalysisTool, GetExecutiveDashboardTool,
  FindProjectTool, ListProjectBuildingsTool, FindBuildingTool, FindContractorTool, FindExtractTool, ListContractorExtractsTool,
  ListExtractPaymentsTool, ListExtractApprovalsTool, GetContractorDuesTool,
] as const;

const ALL_WORKFLOWS = [
  CreateProjectWorkflow, EmployeeOnboardingWorkflow, PurchaseOrderWorkflow, ApprovalProcessWorkflow,
  ContractorOnboardingWorkflow, ExtractWorkflow, KnowledgeFusionWorkflow, ContractorPaymentAnalysisWorkflow,
] as const;

const AI_AGENT_API_URL =
  process.env.AI_AGENT_API_URL ||
  process.env.API_URL ||
  `http://localhost:${process.env.PORT || 3001}`;

@Module({
  imports: [HttpModule.register({ baseURL: AI_AGENT_API_URL, timeout: 30000 }), PrismaModule],
  controllers: [AiAgentController],
  providers: [
    AiAgentService,
    PlannerService,
    ToolRegistryService,
    AgentHttpClient,
    ContextEngineService,
    ConversationMemoryService,
    PermissionCheckerService,
    ErpKnowledgeService,
    WorkflowRegistryService,
    ChainExecutorService,
    SelfEvaluationService,
    ConversationService,
    AgentAnalyticsService,
    ExecutiveReportService,
    LlmConfigService,
    LlmProviderService,
    AgentPromptBuilder,
    LlmAgentService,
    ...ALL_TOOLS,
    ...ALL_WORKFLOWS,
  ],
  exports: [AiAgentService],
})
export class AiAgentModule implements OnModuleInit {
  constructor(
    private readonly registry: ToolRegistryService,
    private readonly workflowRegistry: WorkflowRegistryService,
    private readonly moduleRef: ModuleRef,
  ) {}

  onModuleInit() {
    for (const cls of ALL_TOOLS) {
      const instance = this.moduleRef.get(cls, { strict: false }) as BaseTool;
      if (instance) this.registry.register(instance);
    }
    for (const cls of ALL_WORKFLOWS) {
      const instance = this.moduleRef.get(cls, { strict: false }) as BaseWorkflow;
      if (instance) this.workflowRegistry.register(instance);
    }
  }
}
