import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ISettingRepository, SETTING_REPOSITORY } from './domain/setting.repository';
import { Setting } from './domain/setting.entity';
import { SettingDto } from './domain/setting.interface';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Inject } from '@nestjs/common';

type SettingsChangeCallback = (group: string, key: string, value: any) => void;

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);
  private changeListeners: SettingsChangeCallback[] = [];
  private defaults: Record<string, Record<string, any>> = {};

  constructor(
    @Inject(SETTING_REPOSITORY)
    private readonly repository: ISettingRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaults();
  }

  async get<T>(group: string, key: string): Promise<T | undefined> {
    const setting = await this.repository.findByGroupAndKey(group, key);
    return setting ? (setting.value as T) : undefined;
  }

  async getOrThrow<T>(group: string, key: string): Promise<T> {
    const setting = await this.repository.findByGroupAndKey(group, key);
    if (!setting) throw new Error(`Setting ${group}.${key} not found`);
    return setting.value as T;
  }

  async getGroup<T>(group: string): Promise<Record<string, T>> {
    const settings = await this.repository.findByGroup(group);
    const result: Record<string, T> = {};
    for (const s of settings) {
      result[s.key] = s.value as T;
    }
    return result;
  }

  async getAll(): Promise<Record<string, Record<string, any>>> {
    const all = await this.repository.findAll();
    const result: Record<string, Record<string, any>> = {};
    for (const s of all) {
      if (!result[s.group]) result[s.group] = {};
      result[s.group][s.key] = s.value;
    }
    return result;
  }

  async set(group: string, key: string, value: any): Promise<void> {
    let setting = await this.repository.findByGroupAndKey(group, key);
    if (setting) {
      setting.updateValue(value);
    } else {
      setting = Setting.create({
        group,
        key,
        value,
        valueType: typeof value,
        isSecret: false,
        isReadOnly: false,
      });
    }
    await this.repository.save(setting);
    this.notifyChange(group, key, value);
  }

  async setGroup(group: string, values: Record<string, any>): Promise<void> {
    for (const [key, value] of Object.entries(values)) {
      await this.set(group, key, value);
    }
  }

  async initializeDefaults(): Promise<void> {
    await this.seedDefaults();
  }

  onChange(callback: SettingsChangeCallback): void {
    this.changeListeners.push(callback);
  }

  private notifyChange(group: string, key: string, value: any): void {
    for (const cb of this.changeListeners) {
      try { cb(group, key, value); } catch { /* ignore listener errors */ }
    }
  }

  private async seedDefaults(): Promise<void> {
    const existing = await this.repository.findAll();
    const existingMap = new Set(existing.map((s) => `${s.group}:${s.key}`));

    const defaultGroups: Record<string, Record<string, { value: any; type: string; label?: string; description?: string; isReadOnly?: boolean; isSecret?: boolean }>> = {
      company: {
        name: { value: '', type: 'string', label: 'Company Name', description: 'Full company name in English' },
        arabicName: { value: '', type: 'string', label: 'Company Name (Arabic)', description: 'Full company name in Arabic' },
        logo: { value: '', type: 'string', label: 'Company Logo URL', description: 'URL or path to company logo' },
        favicon: { value: '', type: 'string', label: 'Favicon URL', description: 'URL or path to favicon image' },
        address: { value: '', type: 'string', label: 'Company Address' },
        phone: { value: '', type: 'string', label: 'Company Phone' },
        email: { value: '', type: 'string', label: 'Company Email' },
        taxNumber: { value: '', type: 'string', label: 'Tax Number', description: 'Company tax identification number' },
        commercialRegister: { value: '', type: 'string', label: 'Commercial Register', description: 'Commercial registration number' },
        currency: { value: 'EGP', type: 'string', label: 'Default Currency', description: 'Currency code (EGP, USD, SAR, etc.)' },
        dateFormat: { value: 'DD/MM/YYYY', type: 'string', label: 'Date Format', description: 'Date display format' },
        language: { value: 'ar', type: 'string', label: 'Default Language', description: 'ar or en' },
        timeZone: { value: 'Africa/Cairo', type: 'string', label: 'Time Zone', description: 'IANA time zone identifier' },
        isSetup: { value: false, type: 'boolean', label: 'Setup Complete', isReadOnly: true },
      },
      branding: {
        primaryColor: { value: '#1e40af', type: 'string', label: 'Primary Color', description: 'Primary brand color (hex)' },
        secondaryColor: { value: '#64748b', type: 'string', label: 'Secondary Color', description: 'Secondary brand color (hex)' },
        logoUrl: { value: '', type: 'string', label: 'Logo URL' },
        faviconUrl: { value: '', type: 'string', label: 'Favicon URL' },
        watermark: { value: '', type: 'string', label: 'Watermark Text', description: 'Watermark text for printed documents' },
        qrCodeUrl: { value: '', type: 'string', label: 'QR Code URL', description: 'URL to company QR code image' },
        stampUrl: { value: '', type: 'string', label: 'Company Stamp URL', description: 'URL to company stamp image' },
        digitalStampUrl: { value: '', type: 'string', label: 'Digital Stamp URL', description: 'URL to digital stamp image for PDFs' },
        signatureUrl: { value: '', type: 'string', label: 'Signature URL', description: 'URL to authorized signature image' },
      },
      finance: {
        defaultInsurancePercent: { value: 5, type: 'number', label: 'Default Insurance %', description: 'Default insurance percentage for extracts' },
        maxInsurancePercent: { value: 10, type: 'number', label: 'Max Insurance %' },
        taxRate: { value: 0, type: 'number', label: 'Tax Rate (%)' },
        decimalPlaces: { value: 2, type: 'number', label: 'Decimal Places' },
      },
      attendance: {
        checkInTime: { value: '08:00', type: 'string', label: 'Default Check-In Time' },
        checkOutTime: { value: '17:00', type: 'string', label: 'Default Check-Out Time' },
        lateThreshold: { value: 30, type: 'number', label: 'Late Threshold (minutes)' },
        overtimeEnabled: { value: true, type: 'boolean', label: 'Enable Overtime' },
      },
      ai: {
        embeddingProvider: { value: 'tfidf', type: 'string', label: 'Embedding Provider' },
        vectorStore: { value: 'in-memory', type: 'string', label: 'Vector Store' },
        llmModel: { value: 'gpt-4', type: 'string', label: 'LLM Model' },
        maxTokens: { value: 4096, type: 'number', label: 'Max Tokens' },
        temperature: { value: 0.7, type: 'number', label: 'Temperature' },
      },
      reporting: {
        monthlyReportDay: { value: 1, type: 'number', label: 'Monthly Report Day' },
        weeklyReportDay: { value: 0, type: 'number', label: 'Weekly Report Day (0=Sunday)' },
        timezone: { value: 'Africa/Cairo', type: 'string', label: 'Timezone' },
      },
      notifications: {
        emailEnabled: { value: false, type: 'boolean', label: 'Enable Email Notifications' },
        whatsappEnabled: { value: false, type: 'boolean', label: 'Enable WhatsApp Notifications' },
        pushEnabled: { value: false, type: 'boolean', label: 'Enable Push Notifications' },
        defaultChannels: { value: ['in_app'], type: 'json', label: 'Default Notification Channels' },
      },
      security: {
        passwordMinLength: { value: 8, type: 'number', label: 'Minimum Password Length' },
        mfaEnabled: { value: false, type: 'boolean', label: 'Enable MFA' },
        sessionTimeout: { value: 3600, type: 'number', label: 'Session Timeout (seconds)' },
        maxLoginAttempts: { value: 5, type: 'number', label: 'Max Login Attempts' },
      },
      email: {
        smtpHost: { value: '', type: 'string', label: 'SMTP Host' },
        smtpPort: { value: 587, type: 'number', label: 'SMTP Port' },
        smtpUser: { value: '', type: 'string', label: 'SMTP Username' },
        smtpPass: { value: '', type: 'string', label: 'SMTP Password', isSecret: true },
        fromAddress: { value: '', type: 'string', label: 'From Address' },
        fromName: { value: '', type: 'string', label: 'From Name' },
      },
      workflow: {
        autoApproveThreshold: { value: 0, type: 'number', label: 'Auto-Approve Threshold', description: 'Amount below which approval is automatic (0 = disabled)' },
        requireCEOApproval: { value: false, type: 'boolean', label: 'Require CEO Approval' },
      },
      theme: {
        direction: { value: 'rtl', type: 'string', label: 'Text Direction (rtl/ltr)' },
        fontFamily: { value: 'system-ui', type: 'string', label: 'Font Family', description: 'CSS font-family for UI' },
        fontFamilyArabic: { value: 'system-ui', type: 'string', label: 'Arabic Font Family', description: 'CSS font-family for Arabic text' },
        fontFamilyEnglish: { value: 'system-ui', type: 'string', label: 'English Font Family', description: 'CSS font-family for English text' },
        fontSize: { value: '16px', type: 'string', label: 'Base Font Size', description: 'Base font size for UI' },
        sidebarCollapsed: { value: false, type: 'boolean', label: 'Sidebar Collapsed by Default' },
        borderRadius: { value: '0.5rem', type: 'string', label: 'Border Radius', description: 'Global border radius' },
      },
      backup: {
        enabled: { value: true, type: 'boolean', label: 'Enable Automated Backups' },
        time: { value: '02:00', type: 'string', label: 'Backup Time' },
        retentionDays: { value: 30, type: 'number', label: 'Backup Retention (days)' },
      },
      documentNumber: {
        purchase_order: { value: { prefix: 'PO', padding: 5, resetStrategy: 'yearly', nextNumber: 1 }, type: 'json', label: 'Purchase Order', description: 'PO-YYYY-NNNNN' },
        extract: { value: { prefix: 'EX', padding: 5, resetStrategy: 'yearly', nextNumber: 1 }, type: 'json', label: 'Extract', description: 'EX-YYYY-NNNNN' },
        payment: { value: { prefix: 'PAY', padding: 5, resetStrategy: 'yearly', nextNumber: 1 }, type: 'json', label: 'Payment', description: 'PAY-YYYY-NNNNN' },
        invoice: { value: { prefix: 'INV', padding: 5, resetStrategy: 'yearly', nextNumber: 1 }, type: 'json', label: 'Invoice', description: 'INV-YYYY-NNNNN' },
        project: { value: { prefix: 'PRJ', padding: 4, resetStrategy: 'none', nextNumber: 1 }, type: 'json', label: 'Project', description: 'PRJ-NNNN' },
        report: { value: { prefix: 'RPT', padding: 4, resetStrategy: 'yearly', nextNumber: 1 }, type: 'json', label: 'Report', description: 'RPT-YYYY-NNNN' },
        fund_transaction: { value: { prefix: 'FT', padding: 5, resetStrategy: 'monthly', nextNumber: 1 }, type: 'json', label: 'Fund Transaction', description: 'FT-YYYYMM-NNNNN' },
        client_statement: { value: { prefix: 'CS', padding: 5, resetStrategy: 'monthly', nextNumber: 1 }, type: 'json', label: 'Client Statement', description: 'CS-YYYYMM-NNNNN' },
        subcontractor_statement: { value: { prefix: 'SS', padding: 5, resetStrategy: 'monthly', nextNumber: 1 }, type: 'json', label: 'Subcontractor Statement', description: 'SS-YYYYMM-NNNNN' },
      },
    };

    for (const [group, settings] of Object.entries(defaultGroups)) {
      for (const [key, config] of Object.entries(settings)) {
        if (!existingMap.has(`${group}:${key}`)) {
          const setting = Setting.create({
            group,
            key,
            value: config.value,
            valueType: config.type,
            label: config.label,
            description: config.description,
            isSecret: (config as any).isSecret ?? false,
            isReadOnly: (config as any).isReadOnly ?? false,
          });
          await this.repository.save(setting);
          this.logger.log(`Seeded default setting: ${group}.${key}`);
        }
      }
    }
  }
}
