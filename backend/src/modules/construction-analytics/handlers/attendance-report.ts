import { Injectable } from '@nestjs/common';
import { IReportHandler, ReportData, GenerateReportParams } from '../../reporting-engine/domain/report-handler.interface';
import { ReportDefinition, ReportDefinitionProps } from '../../reporting-engine/domain/report-definition.entity';
import { AnalyticsService } from '../application/analytics.service';

@Injectable()
export class AttendanceReport implements IReportHandler {
  private readonly definition: ReportDefinition;

  constructor(private readonly analytics: AnalyticsService) {
    const props: ReportDefinitionProps = {
      name: 'attendance',
      displayName: 'Enterprise Attendance Report',
      description: 'Attendance rates, absence and late metrics, working hours, overtime, active workforce and daily trend broken down by building and department',
      category: 'hr',
      supportedFormats: ['pdf', 'excel', 'csv'],
      parameterSchema: {
        projectId: { type: 'string', required: true },
        startDate: { type: 'string', default: '' },
        endDate: { type: 'string', default: '' },
      },
      requiresProject: true,
      requiresBuilding: false,
    };
    this.definition = ReportDefinition.create(props);
  }

  getDefinition(): ReportDefinition {
    return this.definition;
  }

  async generate(params: GenerateReportParams): Promise<ReportData> {
    if (!params.projectId) return { rows: [], summary: { error: 'projectId is required' } };

    const intel = await this.analytics.getAttendance(params.projectId);

    const kpiRows = [
      { 'Metric': 'Attendance Rate', 'Value': `${(intel.attendanceRate ?? 0).toFixed(1)}%` },
      { 'Metric': 'Absence Rate', Value: `${(intel.absenceRate ?? 0).toFixed(1)}%` },
      { 'Metric': 'Late Arrival Rate', Value: `${(intel.lateArrivalRate ?? 0).toFixed(1)}%` },
      { 'Metric': 'Average Working Hours', Value: `${(intel.averageWorkingHours ?? 0).toFixed(1)}h` },
      { 'Metric': 'Overtime Hours', Value: `${(intel.overtimeHours ?? 0).toFixed(1)}h` },
      { 'Metric': 'Active Workforce', Value: `${intel.activeWorkforce ?? 0}` },
      { 'Metric': 'Total Records', Value: `${intel.totalRecords ?? 0}` },
      { 'Metric': 'Present', Value: `${intel.present ?? 0}` },
      { 'Metric': 'Late', Value: `${intel.late ?? 0}` },
      { 'Metric': 'Absent', Value: `${intel.absent ?? 0}` },
    ];

    const buildingRows = (intel.byBuilding || []).map((b) => ({
      Level: 'Building',
      Name: b.name,
      Total: b.total,
      Present: b.present,
      Late: b.late,
      Absent: b.absent,
      'Rate %': (b.attendanceRate ?? 0).toFixed(1),
    }));

    const departmentRows = (intel.byDepartment || []).map((d) => ({
      Level: 'Department',
      Name: d.name,
      Total: d.total,
      Present: d.present,
      Late: d.late,
      Absent: d.absent,
      'Rate %': (d.attendanceRate ?? 0).toFixed(1),
    }));

    const dailyRows = (intel.dailyTrend || []).map((t) => ({
      Level: 'Daily Trend',
      Name: t.date,
      Total: t.total,
      Present: t.present,
      Late: t.late,
      Absent: t.absent,
      'Rate %': t.total > 0 ? ((t.present / t.total) * 100).toFixed(1) : '0.0',
    }));

    return {
      rows: [...kpiRows, ...buildingRows, ...departmentRows, ...dailyRows],
      summary: {
        'Attendance Rate': `${(intel.attendanceRate ?? 0).toFixed(1)}%`,
        'Absence Rate': `${(intel.absenceRate ?? 0).toFixed(1)}%`,
        'Late Rate': `${(intel.lateArrivalRate ?? 0).toFixed(1)}%`,
        'Average Hours': `${(intel.averageWorkingHours ?? 0).toFixed(1)}h`,
        'Overtime Hours': `${(intel.overtimeHours ?? 0).toFixed(1)}h`,
        'Active Workforce': `${intel.activeWorkforce ?? 0}`,
      },
    };
  }
}