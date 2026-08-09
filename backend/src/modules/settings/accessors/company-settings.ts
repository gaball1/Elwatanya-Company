import { Injectable, Inject } from '@nestjs/common';
import { SettingsService } from '../settings.service';

@Injectable()
export class CompanySettings {
  constructor(@Inject(SettingsService) private readonly settings: SettingsService) {}

  get name(): Promise<string> { return this.settings.getOrThrow('company', 'name'); }
  get arabicName(): Promise<string> { return this.settings.getOrThrow('company', 'arabicName'); }
  get logo(): Promise<string> { return this.settings.getOrThrow('company', 'logo'); }
  get favicon(): Promise<string> { return this.settings.getOrThrow('company', 'favicon'); }
  get address(): Promise<string> { return this.settings.getOrThrow('company', 'address'); }
  get phone(): Promise<string> { return this.settings.getOrThrow('company', 'phone'); }
  get email(): Promise<string> { return this.settings.getOrThrow('company', 'email'); }
  get taxNumber(): Promise<string> { return this.settings.getOrThrow('company', 'taxNumber'); }
  get commercialRegister(): Promise<string> { return this.settings.getOrThrow('company', 'commercialRegister'); }
  get currency(): Promise<string> { return this.settings.getOrThrow('company', 'currency'); }
  get dateFormat(): Promise<string> { return this.settings.getOrThrow('company', 'dateFormat'); }
  get language(): Promise<string> { return this.settings.getOrThrow('company', 'language'); }
  get timeZone(): Promise<string> { return this.settings.getOrThrow('company', 'timeZone'); }
  get isSetup(): Promise<boolean> { return this.settings.getOrThrow('company', 'isSetup'); }
}
