import { Injectable, Logger } from '@nestjs/common';
import { ImportExportHandler } from '../domain/import-export-handler.interface';

@Injectable()
export class ImportExportHandlerRegistry {
  private readonly logger = new Logger(ImportExportHandlerRegistry.name);
  private handlers = new Map<string, ImportExportHandler>();

  register(handler: ImportExportHandler): void {
    this.handlers.set(handler.entityType, handler);
    this.logger.log(`Import/Export handler registered: ${handler.entityType}`);
  }

  getHandler(entityType: string): ImportExportHandler {
    const handler = this.handlers.get(entityType);
    if (!handler) throw new Error(`No import/export handler for entity type: ${entityType}`);
    return handler;
  }

  getHandlers(): ImportExportHandler[] {
    return Array.from(this.handlers.values());
  }
}
