import { Injectable } from '@nestjs/common';
import { IReportHandler, ReportData, GenerateReportParams } from '../../reporting-engine/domain/report-handler.interface';
import { ReportDefinition, ReportDefinitionProps } from '../../reporting-engine/domain/report-definition.entity';
import { ConstructionBiService } from '../application/construction-bi.service';

@Injectable()
export class ProjectDashboardReport implements IReportHandler {
  private readonly definition: ReportDefinition;

  constructor(private readonly bi: ConstructionBiService) {
    const props: ReportDefinitionProps = {
      name: 'project_dashboard',
      displayName: 'Project Dashboard',
      description: 'Full project KPI dashboard with earned value, financial, performance, and risk metrics',
      category: 'bi',
      supportedFormats: ['pdf', 'excel', 'csv'],
      parameterSchema: { projectId: { type: 'string', required: true } },
      requiresProject: true,
      requiresBuilding: false,
    };
    this.definition = ReportDefinition.create(props);
  }

  getDefinition(): ReportDefinition { return this.definition; }

  async generate(params: GenerateReportParams, _user: any): Promise<ReportData> {
    if (!params.projectId) return { rows: [], summary: { error: 'projectId is required' } };

    const dashboard = await this.bi.getProjectDashboard(params.projectId);
    const rows = dashboard.kpis.map((kpi) => ({
      KPI: kpi.key,
      Value: kpi.display,
      Status: kpi.status || 'N/A',
    }));

    return {
      rows,
      summary: {
        'Project': dashboard.summary.projectName,
        'Status': dashboard.summary.status,
        'Progress': `${dashboard.summary.progress}%`,
        'Buildings': dashboard.details.buildings,
        'Statements (Final/Total)': `${dashboard.details.statements.final}/${dashboard.details.statements.total}`,
        'Attendance Rate': dashboard.details.attendance ? `${(dashboard.details.attendance.attendanceRate ?? 0).toFixed(1)}%` : 'N/A',
        'Present': dashboard.details.attendance ? `${dashboard.details.attendance.present}` : 'N/A',
        'Active Workforce': dashboard.details.attendance ? `${dashboard.details.attendance.activeWorkforce}` : 'N/A',
      },
    };
  }
}
