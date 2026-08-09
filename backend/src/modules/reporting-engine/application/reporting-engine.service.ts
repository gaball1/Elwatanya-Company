import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ReportHandlerRegistry } from '../infrastructure/report-handler.registry';
import { IReportFormatProvider } from '../domain/format-provider.interface';
import { ReportFormat } from '../domain/report-definition.entity';
import { GenerateReportParams } from '../domain/report-handler.interface';

@Injectable()
export class ReportingEngineService {
  private readonly logger = new Logger(ReportingEngineService.name);
  private readonly formatProviders = new Map<string, IReportFormatProvider>();

  constructor(
    private readonly handlerRegistry: ReportHandlerRegistry,
  ) {}

  registerFormatProvider(provider: IReportFormatProvider): void {
    this.formatProviders.set(provider.format, provider);
  }

  getAvailableReports(): any[] {
    return this.handlerRegistry.getAll().map((h) => {
      const def = h.getDefinition();
      return {
        name: def.name,
        displayName: def.displayName,
        description: def.description,
        category: def.category,
        supportedFormats: def.supportedFormats,
        parameterSchema: def.parameterSchema,
        requiresProject: def.requiresProject,
        requiresBuilding: def.requiresBuilding,
      };
    });
  }

  async generateReport(
    reportName: string,
    format: ReportFormat,
    params: GenerateReportParams,
    user: any,
  ): Promise<{ filename: string; mimeType: string; buffer: Buffer }> {
    const handler = this.handlerRegistry.get(reportName);
    if (!handler) {
      throw new NotFoundException(`Report '${reportName}' not found`);
    }

    const definition = handler.getDefinition();
    if (!definition.supportsFormat(format)) {
      throw new BadRequestException(`Report '${reportName}' does not support format '${format}'`);
    }

    const provider = this.formatProviders.get(format);
    if (!provider) {
      throw new BadRequestException(`Format provider '${format}' not registered`);
    }

    const data = await handler.generate(params, user);

    return provider.render(definition, data, user);
  }

  async previewReport(
    reportName: string,
    params: GenerateReportParams,
  ): Promise<string> {
    const handler = this.handlerRegistry.get(reportName);
    if (!handler) {
      throw new NotFoundException(`Report '${reportName}' not found`);
    }

    const user = { token: '', sub: '', email: '', permissions: [] as string[], role: '' };
    const data = await handler.generate(params, user);

    const headers = data.rows.length > 0 ? Object.keys(data.rows[0]) : [];
    const tableHtml = this.buildPreviewTable(headers, data.rows);
    const summaryHtml = data.summary ? this.buildPreviewSummary(data.summary) : '';

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8">
<title>${this.escapeHtml(handler.getDefinition().displayName)}</title>
<style>
  body { font-family: 'Segoe UI', 'Traditional Arabic', system-ui, sans-serif; color: #1e293b; margin: 0; padding: 16px; }
  h2 { color: #1e40af; margin: 0 0 4px; }
  .desc { color: #64748b; font-size: 13px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #1e40af; color: white; padding: 8px 10px; text-align: left; font-weight: 500; }
  td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) { background: #f8fafc; }
  .summary { margin-top: 16px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; }
  .summary h4 { color: #1e40af; margin: 0 0 8px; font-size: 14px; }
  .summary p { margin: 3px 0; }
  .summary strong { color: #334155; }
  .no-data { color: #64748b; font-style: italic; }
</style>
</head>
<body>
  <h2>${this.escapeHtml(handler.getDefinition().displayName)}</h2>
  <div class="desc">${this.escapeHtml(handler.getDefinition().description)}</div>
  ${tableHtml}
  ${summaryHtml}
</body></html>`;
  }

  private buildPreviewTable(headers: string[], rows: Record<string, any>[]): string {
    if (rows.length === 0) return '<p class="no-data">No data available.</p>';
    return `<table><thead><tr>${headers.map((h) => `<th>${this.escapeHtml(String(h))}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${headers.map((h) => `<td>${this.escapeHtml(String(row[h] ?? ''))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }

  private buildPreviewSummary(summary: Record<string, any>): string {
    const entries = Object.entries(summary);
    if (entries.length === 0) return '';
    return `<div class="summary"><h4>Summary</h4>${entries.map(([k, v]) => `<p><strong>${this.escapeHtml(String(k))}:</strong> ${this.escapeHtml(String(v))}</p>`).join('')}</div>`;
  }

  private escapeHtml(text: string): string {
    return String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
