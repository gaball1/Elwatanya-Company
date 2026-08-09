import { Injectable, Logger } from '@nestjs/common';
import { SettingsService } from '../../settings/settings.service';
import { DocumentNumberConfig, ResetStrategy } from '../domain/document-number.entity';

@Injectable()
export class DocumentNumberService {
  private readonly logger = new Logger(DocumentNumberService.name);
  private readonly defaultConfigs: Record<string, { prefix: string; padding: number; resetStrategy: ResetStrategy }> = {
    purchase_order: { prefix: 'PO', padding: 5, resetStrategy: 'yearly' },
    extract: { prefix: 'EX', padding: 5, resetStrategy: 'yearly' },
    payment: { prefix: 'PAY', padding: 5, resetStrategy: 'yearly' },
    invoice: { prefix: 'INV', padding: 5, resetStrategy: 'yearly' },
    project: { prefix: 'PRJ', padding: 4, resetStrategy: 'none' },
    contract: { prefix: 'CTR', padding: 4, resetStrategy: 'none' },
    employee: { prefix: 'EMP', padding: 4, resetStrategy: 'none' },
    report: { prefix: 'RPT', padding: 4, resetStrategy: 'yearly' },
    fund_transaction: { prefix: 'FT', padding: 5, resetStrategy: 'monthly' },
    client_statement: { prefix: 'CS', padding: 5, resetStrategy: 'monthly' },
    subcontractor_statement: { prefix: 'SS', padding: 5, resetStrategy: 'monthly' },
    purchase_request: { prefix: 'PR', padding: 5, resetStrategy: 'yearly' },
  };

  constructor(private readonly settings: SettingsService) {}

  async getConfig(documentType: string): Promise<DocumentNumberConfig> {
    const stored = await this.settings.get<any>('documentNumber', documentType);
    if (stored) {
      return DocumentNumberConfig.create({
        documentType,
        prefix: stored.prefix,
        padding: stored.padding,
        resetStrategy: stored.resetStrategy,
        nextNumber: stored.nextNumber ?? 1,
        lastResetAt: stored.lastResetAt ? new Date(stored.lastResetAt) : undefined,
      });
    }
    const def = this.defaultConfigs[documentType];
    if (def) {
      const config = DocumentNumberConfig.create({ documentType, ...def, nextNumber: 1 });
      await this.saveConfig(config);
      return config;
    }
    const defaultConfig = DocumentNumberConfig.create({ documentType, prefix: 'DOC', padding: 5, resetStrategy: 'yearly', nextNumber: 1 });
    await this.saveConfig(defaultConfig);
    return defaultConfig;
  }

  async configure(documentType: string, data: { prefix?: string; padding?: number; resetStrategy?: ResetStrategy }): Promise<DocumentNumberConfig> {
    const existing = await this.getConfig(documentType);
    const config = DocumentNumberConfig.create({
      documentType,
      prefix: data.prefix ?? existing.prefix,
      padding: data.padding ?? existing.padding,
      resetStrategy: data.resetStrategy ?? existing.resetStrategy,
      nextNumber: existing.nextNumber,
      lastResetAt: existing.lastResetAt,
    });
    await this.saveConfig(config);
    return config;
  }

  async resetCounter(documentType: string, nextNumber: number = 1): Promise<DocumentNumberConfig> {
    const config = await this.getConfig(documentType);
    config.reset(nextNumber);
    await this.saveConfig(config);
    return config;
  }

  async generate(documentType: string, date?: Date): Promise<string> {
    const now = date || new Date();
    const config = await this.getConfig(documentType);

    if (config.needsReset(now)) {
      config.reset(1);
    }

    const number = config.generate(now);
    config.increment();
    await this.saveConfig(config);
    return number;
  }

  async getAllConfigs(): Promise<any[]> {
    const all = await this.settings.getGroup<any>('documentNumber');
    const configs: any[] = [];
    for (const [key, value] of Object.entries(all)) {
      configs.push({ documentType: key, ...value });
    }
    for (const [key, def] of Object.entries(this.defaultConfigs)) {
      if (!all[key]) {
        configs.push({ documentType: key, ...def, nextNumber: 1 });
      }
    }
    return configs;
  }

  private async saveConfig(config: DocumentNumberConfig): Promise<void> {
    await this.settings.set('documentNumber', config.documentType, {
      prefix: config.prefix,
      padding: config.padding,
      resetStrategy: config.resetStrategy,
      nextNumber: config.nextNumber,
      lastResetAt: config.lastResetAt?.toISOString(),
    });
  }
}
