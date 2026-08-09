import { Injectable, Inject } from '@nestjs/common';
import { SettingsService } from '../settings.service';

@Injectable()
export class FinanceSettings {
  constructor(@Inject(SettingsService) private readonly settings: SettingsService) {}

  get defaultInsurancePercent(): Promise<number> { return this.settings.getOrThrow('finance', 'defaultInsurancePercent'); }
  get maxInsurancePercent(): Promise<number> { return this.settings.getOrThrow('finance', 'maxInsurancePercent'); }
  get taxRate(): Promise<number> { return this.settings.getOrThrow('finance', 'taxRate'); }
  get decimalPlaces(): Promise<number> { return this.settings.getOrThrow('finance', 'decimalPlaces'); }
}
