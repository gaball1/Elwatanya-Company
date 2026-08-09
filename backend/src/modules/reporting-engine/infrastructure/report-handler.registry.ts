import { Injectable } from '@nestjs/common';
import { IReportHandler } from '../domain/report-handler.interface';

@Injectable()
export class ReportHandlerRegistry {
  private readonly handlers = new Map<string, IReportHandler>();

  register(handler: IReportHandler): void {
    const def = handler.getDefinition();
    this.handlers.set(def.name, handler);
  }

  get(name: string): IReportHandler | undefined {
    return this.handlers.get(name);
  }

  getAll(): IReportHandler[] {
    return Array.from(this.handlers.values());
  }

  findByCategory(category: string): IReportHandler[] {
    return this.getAll().filter((h) => h.getDefinition().category === category);
  }
}
