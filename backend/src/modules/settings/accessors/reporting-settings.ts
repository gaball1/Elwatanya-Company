import { Injectable, Inject } from '@nestjs/common';
import { SettingsService } from '../settings.service';

@Injectable()
export class ReportingSettings {
  constructor(@Inject(SettingsService) private readonly settings: SettingsService) {}

  get monthlyReportDay(): Promise<number> { return this.settings.getOrThrow('reporting', 'monthlyReportDay'); }
  get weeklyReportDay(): Promise<number> { return this.settings.getOrThrow('reporting', 'weeklyReportDay'); }
  get timezone(): Promise<string> { return this.settings.getOrThrow('reporting', 'timezone'); }
}
