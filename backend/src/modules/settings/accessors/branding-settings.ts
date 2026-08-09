import { Injectable, Inject } from '@nestjs/common';
import { SettingsService } from '../settings.service';

@Injectable()
export class BrandingSettings {
  constructor(@Inject(SettingsService) private readonly settings: SettingsService) {}

  get primaryColor(): Promise<string> { return this.settings.getOrThrow('branding', 'primaryColor'); }
  get secondaryColor(): Promise<string> { return this.settings.getOrThrow('branding', 'secondaryColor'); }
  get logoUrl(): Promise<string> { return this.settings.getOrThrow('branding', 'logoUrl'); }
  get faviconUrl(): Promise<string> { return this.settings.getOrThrow('branding', 'faviconUrl'); }
  get watermark(): Promise<string> { return this.settings.getOrThrow('branding', 'watermark'); }
  get qrCodeUrl(): Promise<string> { return this.settings.getOrThrow('branding', 'qrCodeUrl'); }
  get stampUrl(): Promise<string> { return this.settings.getOrThrow('branding', 'stampUrl'); }
  get digitalStampUrl(): Promise<string> { return this.settings.getOrThrow('branding', 'digitalStampUrl'); }
  get signatureUrl(): Promise<string> { return this.settings.getOrThrow('branding', 'signatureUrl'); }
}
