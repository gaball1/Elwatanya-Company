import { Injectable, Inject } from '@nestjs/common';
import { SettingsService } from '../settings.service';

@Injectable()
export class EmailSettings {
  constructor(@Inject(SettingsService) private readonly settings: SettingsService) {}

  async getSmtpHost(): Promise<string | undefined> { return this.settings.get('email', 'smtpHost'); }
  async getSmtpPort(): Promise<number | undefined> { return this.settings.get('email', 'smtpPort'); }
  async getSmtpUser(): Promise<string | undefined> { return this.settings.get('email', 'smtpUser'); }
  async getSmtpPass(): Promise<string | undefined> { return this.settings.get('email', 'smtpPass'); }
  async getFromAddress(): Promise<string | undefined> { return this.settings.get('email', 'fromAddress'); }
  async getFromName(): Promise<string | undefined> { return this.settings.get('email', 'fromName'); }
}
