import { Injectable, Inject } from '@nestjs/common';
import { SettingsService } from '../settings.service';

@Injectable()
export class ThemeSettings {
  constructor(@Inject(SettingsService) private readonly settings: SettingsService) {}

  get direction(): Promise<string> { return this.settings.getOrThrow('theme', 'direction'); }
  get fontFamily(): Promise<string> { return this.settings.getOrThrow('theme', 'fontFamily'); }
  get fontFamilyArabic(): Promise<string> { return this.settings.getOrThrow('theme', 'fontFamilyArabic'); }
  get fontFamilyEnglish(): Promise<string> { return this.settings.getOrThrow('theme', 'fontFamilyEnglish'); }
  get fontSize(): Promise<string> { return this.settings.getOrThrow('theme', 'fontSize'); }
  get sidebarCollapsed(): Promise<boolean> { return this.settings.getOrThrow('theme', 'sidebarCollapsed'); }
  get borderRadius(): Promise<string> { return this.settings.getOrThrow('theme', 'borderRadius'); }
}
