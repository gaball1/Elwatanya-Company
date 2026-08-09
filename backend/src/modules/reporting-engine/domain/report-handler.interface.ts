import { ReportDefinition } from './report-definition.entity';

export interface ReportData {
  rows: Record<string, any>[];
  summary?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface GenerateReportParams {
  projectId?: string;
  buildingId?: string;
  startDate?: string;
  endDate?: string;
  filters?: Record<string, any>;
  parameters?: Record<string, any>;
}

export interface IReportHandler {
  getDefinition(): ReportDefinition;
  generate(params: GenerateReportParams, user: any): Promise<ReportData>;
}
