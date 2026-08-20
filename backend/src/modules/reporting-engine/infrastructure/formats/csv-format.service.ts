import { Injectable } from '@nestjs/common';
import { IReportFormatProvider, FormattedReport } from '../../domain/format-provider.interface';
import { ReportDefinition } from '../../domain/report-definition.entity';
import { ReportData } from '../../domain/report-handler.interface';

@Injectable()
export class CsvFormatProvider implements IReportFormatProvider {
  readonly format = 'csv' as const;

  async render(definition: ReportDefinition, data: ReportData, _user: any): Promise<FormattedReport> {
    const rows = data.rows;
    const hasRows = rows.length > 0;
    const headers = hasRows ? Object.keys(rows[0]) : [];
    const csvLines: string[] = [];

    if (!hasRows) {
      csvLines.push('No data available');
    } else {
      csvLines.push(headers.map((h) => this.escapeField(h)).join(','));

      for (const row of rows) {
        csvLines.push(headers.map((h) => this.escapeField(String(row[h] ?? ''))).join(','));
      }
    }

    if (data.summary) {
      csvLines.push('');
      csvLines.push('--- Summary ---');
      for (const [key, value] of Object.entries(data.summary)) {
        csvLines.push(`${key},${this.escapeField(String(value ?? ''))}`);
      }
    }

    const buffer = Buffer.from('\uFEFF' + csvLines.join('\r\n'), 'utf-8');
    return { filename: `${definition.name}.csv`, mimeType: 'text/csv', buffer };
  }

  private escapeField(value: string): string {
    // CSV formula injection guard: prefix '=' '+', '-', '@', '\t', '\r' with '
    // so spreadsheet apps treat them as text instead of formulas.
    if (/^[=+\-@\t\r]/.test(value)) {
      value = `'${value}`;
    }
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
