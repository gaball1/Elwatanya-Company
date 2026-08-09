import { Injectable } from '@nestjs/common';
import { FormatProvider } from './format-provider.interface';

@Injectable()
export class JsonFormatProvider implements FormatProvider {
  readonly format = 'json';
  readonly mimeType = 'application/json';

  async parse(buffer: Buffer): Promise<Record<string, any>[]> {
    const text = buffer.toString('utf-8');
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  }

  async stringify(data: Record<string, any>[], _columns: { key: string; label: string }[]): Promise<Buffer> {
    return Buffer.from(JSON.stringify(data, null, 2), 'utf-8');
  }
}
