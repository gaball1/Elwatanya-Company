import { Injectable, Inject } from '@nestjs/common';
import { SettingsService } from '../settings.service';

@Injectable()
export class SecuritySettings {
  constructor(@Inject(SettingsService) private readonly settings: SettingsService) {}

  get passwordMinLength(): Promise<number> { return this.settings.getOrThrow('security', 'passwordMinLength'); }
  get mfaEnabled(): Promise<boolean> { return this.settings.getOrThrow('security', 'mfaEnabled'); }
  get sessionTimeout(): Promise<number> { return this.settings.getOrThrow('security', 'sessionTimeout'); }
  get maxLoginAttempts(): Promise<number> { return this.settings.getOrThrow('security', 'maxLoginAttempts'); }
}
