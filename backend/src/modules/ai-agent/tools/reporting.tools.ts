import { Injectable } from '@nestjs/common';
import { BaseTool } from './base.tool';
import { schema } from './tool-schemas';

@Injectable()
export class ListReportsTool extends BaseTool {
  readonly name = 'list_reports';
  readonly description = 'List all available reports in the system with their supported formats and descriptions';
  readonly requiresPermission = 'reports.read';
  readonly requiredEntity = 'report';
  readonly parameters = schema({});

  async execute(_args: Record<string, any>, user: any): Promise<any> {
    try {
      const response = await fetch(
        `${process.env.API_URL || 'http://localhost:3001'}/api/v1/reporting/reports`,
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      const data = await response.json();
      return this.success(data);
    } catch {
      return this.fail('Report list unavailable');
    }
  }
}

@Injectable()
export class GenerateReportTool extends BaseTool {
  readonly name = 'generate_report';
  readonly description = 'Generate a report in pdf, excel, or csv format. Specify reportName, format (pdf/excel/csv), and optional filters (projectId, startDate, endDate).';
  readonly requiresPermission = 'reports.generate';
  readonly requiredEntity = 'report';

  async execute(args: Record<string, any>, user: any): Promise<any> {
    const reportName = args.reportName;
    const format = args.format || 'csv';
    if (!reportName) return this.fail('reportName is required');

    try {
      const response = await fetch(
        `${process.env.API_URL || 'http://localhost:3001'}/api/v1/reporting/${reportName}/generate?format=${format}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
          body: JSON.stringify({
            projectId: args.projectId,
            buildingId: args.buildingId,
            startDate: args.startDate,
            endDate: args.endDate,
            filters: args.filters,
          }),
        },
      );

      if (!response.ok) {
        const text = await response.text();
        return this.fail(`Report generation failed: ${text}`);
      }

      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');

      return this.success({
        reportName,
        format,
        filename: `${reportName}.${format}`,
        data: base64,
        size: buffer.byteLength,
      });
    } catch {
      return this.fail('Report generation failed');
    }
  }
}
