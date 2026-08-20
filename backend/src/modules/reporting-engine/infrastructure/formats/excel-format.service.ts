import { Injectable } from '@nestjs/common';
import { IReportFormatProvider, FormattedReport } from '../../domain/format-provider.interface';
import { ReportDefinition } from '../../domain/report-definition.entity';
import { ReportData } from '../../domain/report-handler.interface';

@Injectable()
export class ExcelFormatProvider implements IReportFormatProvider {
  readonly format = 'excel' as const;

  async render(definition: ReportDefinition, data: ReportData, _user: any): Promise<FormattedReport> {
    const rows = data.rows;
    const hasRows = rows.length > 0;
    const headers = hasRows ? Object.keys(rows[0]) : [];
    const csvLines: string[] = [];

    if (!hasRows) {
      csvLines.push('No data available');
    } else {
      csvLines.push(headers.map((h) => this.escapeCell(h)).join('\t'));

      for (const row of rows) {
        csvLines.push(headers.map((h) => this.escapeCell(String(row[h] ?? ''))).join('\t'));
      }
    }

    const tsv = csvLines.join('\r\n');
    const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>${definition.displayName}</x:Name></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>td { mso-number-format:\\@; }</style></head>
<body><table>${csvLines.map((line) => `<tr>${line.split('\t').map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</table></body></html>`;

    const buffer = Buffer.from(html, 'utf-8');
    return { filename: `${definition.name}.xls`, mimeType: 'application/vnd.ms-excel', buffer };
  }

  private escapeCell(value: string): string {
    // CSV/formula injection guard: prefix '=' '+', '-', '@', '\t', '\r' with '
    // so spreadsheet apps treat them as text instead of formulas.
    if (/^[=+\-@\t\r]/.test(value)) {
      value = `'${value}`;
    }
    if (value.includes('\t') || value.includes('\n') || value.includes('"')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
