import { Injectable } from '@nestjs/common';
import { IReportFormatProvider, FormattedReport } from '../../domain/format-provider.interface';
import { ReportDefinition } from '../../domain/report-definition.entity';
import { ReportData } from '../../domain/report-handler.interface';
import { PdfEngineService } from '../../../pdf-engine/application/pdf-engine.service';
import { PdfDocument } from '../../../pdf-engine/domain/pdf-document.entity';

@Injectable()
export class PdfFormatProvider implements IReportFormatProvider {
  readonly format = 'pdf' as const;

  constructor(private readonly pdfEngine: PdfEngineService) {}

  async render(definition: ReportDefinition, data: ReportData, user: any): Promise<FormattedReport> {
    const headers = data.rows.length > 0 ? Object.keys(data.rows[0]) : [];
    const tableHtml = this.buildTable(headers, data.rows);
    const summaryHtml = data.summary ? this.buildSummary(data.summary) : '';

    const doc = PdfDocument.create({
      title: definition.displayName,
      documentNumber: `RPT-${definition.name.toUpperCase()}`,
      generatedBy: user?.email || 'System',
      generatedAt: new Date(),
      orientation: 'portrait',
      pageSize: 'A4',
      sections: [
        { title: definition.description, content: tableHtml + summaryHtml },
      ],
    });

    return this.pdfEngine.render(doc);
  }

  private buildTable(headers: string[], rows: Record<string, any>[]): string {
    if (rows.length === 0) return '<p>No data available.</p>';
    return `<table><thead><tr>${headers.map((h) => `<th>${this.escapeHtml(h)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${headers.map((h) => `<td>${this.escapeHtml(row[h])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }

  private buildSummary(summary: Record<string, any>): string {
    return `<div style="margin-top:20px;padding:15px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
      <h3 style="color:#1e40af;margin:0 0 10px;font-size:14px;">Summary</h3>
      ${Object.entries(summary).map(([k, v]) => `<p style="margin:3px 0;font-size:13px;"><strong>${this.escapeHtml(k)}:</strong> ${this.escapeHtml(v)}</p>`).join('')}
    </div>`;
  }

  private escapeHtml(text: unknown): string {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
