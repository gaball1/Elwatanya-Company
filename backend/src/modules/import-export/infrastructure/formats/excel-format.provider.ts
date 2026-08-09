import { Injectable } from '@nestjs/common';
import { FormatProvider } from './format-provider.interface';

@Injectable()
export class ExcelFormatProvider implements FormatProvider {
  readonly format = 'xlsx';
  readonly mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  async parse(_buffer: Buffer): Promise<Record<string, any>[]> {
    throw new Error('Excel support requires the "xlsx" package. Install with: npm install xlsx');
  }

  async stringify(_data: Record<string, any>[], _columns: { key: string; label: string }[]): Promise<Buffer> {
    throw new Error('Excel support requires the "xlsx" package. Install with: npm install xlsx');
  }
}
