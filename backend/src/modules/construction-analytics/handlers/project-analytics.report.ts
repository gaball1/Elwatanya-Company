import { Injectable } from '@nestjs/common';
import { IReportHandler, ReportData, GenerateReportParams } from '../../reporting-engine/domain/report-handler.interface';
import { ReportDefinition, ReportDefinitionProps } from '../../reporting-engine/domain/report-definition.entity';
import { AnalyticsService } from '../application/analytics.service';

@Injectable()
export class ProjectAnalyticsReport implements IReportHandler {
  private readonly definition: ReportDefinition;

  constructor(private readonly analytics: AnalyticsService) {
    const props: ReportDefinitionProps = {
      name: 'project_analytics',
      displayName: 'Project Analytics',
      description: 'Comprehensive project analytics: KPIs, EVM, progress, cost breakdown, BOQ intelligence, contractor performance, treasury and risks',
      category: 'analytics',
      supportedFormats: ['pdf', 'excel', 'csv'],
      parameterSchema: { projectId: { type: 'string', required: true } },
      requiresProject: true,
      requiresBuilding: false,
    };
    this.definition = ReportDefinition.create(props);
  }

  getDefinition(): ReportDefinition { return this.definition; }

  async generate(params: GenerateReportParams): Promise<ReportData> {
    if (!params.projectId) return { rows: [], summary: { error: 'projectId is required' } };

    const dashboard = await this.analytics.getDashboard(params.projectId);

    const kpiRows = Object.values(dashboard.kpis).map((kpi: any) => ({
      'KPI': kpi.label,
      'Value': Number.isInteger(kpi.value) ? kpi.value : kpi.value.toFixed(2),
      'Status': kpi.status,
    }));

    const boqRows = dashboard.boq.items.map((item) => ({
      'Item Code': item.itemCode,
      'Description': item.description,
      'Employer Value': item.employerValue,
      'Contractor Value': item.contractorValue ?? 0,
      'Profit': item.profit,
      'Margin %': item.margin,
      'Classification': item.classification,
    }));

    const contractorRows = dashboard.contractors.map((c) => ({
      'Contractor': c.name,
      'Work Type': c.workType ?? '',
      'Assigned BOQ': c.assignedBOQ,
      'Extracts': c.extractValue,
      'Paid': c.paid,
      'Avg Execution %': c.averageExecution,
      'Performance Score': c.performanceScore,
    }));

    const riskRows = dashboard.risks.items.map((r) => ({
      'Risk': r.label,
      'Severity': r.severity,
      'Probability': `${Math.round(r.probability * 100)}%`,
      'Impact': r.impact,
      'Recommendation': r.recommendation,
    }));

    return {
      rows: [
        ...kpiRows,
        ...boqRows,
        ...contractorRows,
        ...riskRows,
      ],
      summary: {
        'Project': dashboard.project?.name ?? '',
        'Status': dashboard.project?.status ?? '',
        'Progress': `${dashboard.progress.projectPercent}%`,
        'Earned Value': dashboard.evm.ev,
        'CPI': dashboard.evm.cpi,
        'SPI': dashboard.evm.spi,
        'EAC': dashboard.evm.eac,
        'Revenue': dashboard.cost.employerValue,
        'Cost': dashboard.cost.actualCost,
        'Profit': dashboard.cost.profit,
        'Margin %': dashboard.cost.margin,
        'Cash Balance': dashboard.treasury.balance,
        'Risk Score': dashboard.risks.score.overall,
      },
    };
  }
}
