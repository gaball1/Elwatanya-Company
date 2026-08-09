import { Injectable, Logger } from '@nestjs/common';
import { ImportExportHandlerRegistry } from './infrastructure/handler-registry.service';
import { FormatProvider } from './infrastructure/formats/format-provider.interface';
import { FormatType } from './domain/import-export-handler.interface';

@Injectable()
export class ImportExportService {
  private readonly logger = new Logger(ImportExportService.name);
  private formatProviders = new Map<string, FormatProvider>();

  constructor(private readonly handlerRegistry: ImportExportHandlerRegistry) {}

  registerFormatProvider(provider: FormatProvider): void {
    this.formatProviders.set(provider.format, provider);
    this.logger.log(`Format provider registered: ${provider.format}`);
  }

  async importFromBuffer(entityType: string, buffer: Buffer, format: FormatType): Promise<{
    imported: number;
    failed: number;
    errors: { row: number; field: string; message: string }[];
  }> {
    const handler = this.handlerRegistry.getHandler(entityType);
    const provider = this.getFormatProvider(format);

    if (!handler.supportedFormats.includes(format)) {
      throw new Error(`Handler '${entityType}' does not support format '${format}'`);
    }

    const rows = await provider.parse(buffer);
    let imported = 0;
    let failed = 0;
    const errors: { row: number; field: string; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const validationErrors = await handler.validate(rows[i], i);
      if (validationErrors.length > 0) {
        failed++;
        errors.push(...validationErrors);
        continue;
      }

      try {
        const result = await handler.import(rows[i]);
        if (result.success) {
          imported++;
        } else {
          failed++;
          if (result.errors) {
            errors.push(...result.errors.map((e) => ({ row: i, field: 'general', message: e })));
          }
        }
      } catch (err) {
        failed++;
        errors.push({ row: i, field: 'general', message: (err as Error).message });
      }
    }

    return { imported, failed, errors };
  }

  async exportToBuffer(entityType: string, format: FormatType, filter?: Record<string, any>): Promise<{
    buffer: Buffer;
    mimeType: string;
  }> {
    const handler = this.handlerRegistry.getHandler(entityType);
    const provider = this.getFormatProvider(format);

    if (!handler.supportedFormats.includes(format)) {
      throw new Error(`Handler '${entityType}' does not support format '${format}'`);
    }

    const data = await handler.exportData(filter);
    const columns = handler.exportHeaders();
    const buffer = await provider.stringify(data, columns);

    return { buffer, mimeType: provider.mimeType };
  }

  private getFormatProvider(format: FormatType): FormatProvider {
    const provider = this.formatProviders.get(format);
    if (!provider) throw new Error(`No format provider for: ${format}`);
    return provider;
  }
}
