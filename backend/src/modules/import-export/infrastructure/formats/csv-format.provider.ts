import { Injectable } from '@nestjs/common';
import { FormatProvider } from './format-provider.interface';

@Injectable()
export class CsvFormatProvider implements FormatProvider {
  readonly format = 'csv';
  readonly mimeType = 'text/csv';

  async parse(buffer: Buffer): Promise<Record<string, any>[]> {
    const text = buffer.toString('utf-8').replace(/^\uFEFF/, '');
    const lines = text.split('\n').filter((l) => l.trim());
    if (lines.length < 2) return [];

    const headers = this.parseLine(lines[0]);
    const results: Record<string, any>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseLine(lines[i]);
      if (values.length === 0) continue;
      const row: Record<string, any> = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j] ?? '';
      }
      results.push(row);
    }
    return results;
  }

  async stringify(data: Record<string, any>[], columns: { key: string; label: string }[]): Promise<Buffer> {
    const header = columns.map((c) => this.escapeField(c.label)).join(',');
    const rows = data.map((row) =>
      columns.map((c) => this.escapeField(String(row[c.key] ?? ''))).join(','),
    );
    return Buffer.from([header, ...rows].join('\n'), 'utf-8');
  }

  private parseLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    result.push(current.trim());
    return result;
  }

  private escapeField(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
