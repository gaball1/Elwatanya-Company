import { ReportDefinition } from './report-definition.entity';
import { ReportData } from './report-handler.interface';

export interface FormattedReport {
  filename: string;
  mimeType: string;
  buffer: Buffer;
}

export interface IReportFormatProvider {
  format: 'pdf' | 'excel' | 'csv';
  render(definition: ReportDefinition, data: ReportData, user: any): Promise<FormattedReport>;
}
