import { Injectable, Inject } from '@nestjs/common';
import { SettingsService } from '../settings.service';

@Injectable()
export class AttendanceSettings {
  constructor(@Inject(SettingsService) private readonly settings: SettingsService) {}

  get checkInTime(): Promise<string> { return this.settings.getOrThrow('attendance', 'checkInTime'); }
  get checkOutTime(): Promise<string> { return this.settings.getOrThrow('attendance', 'checkOutTime'); }
  get lateThreshold(): Promise<number> { return this.settings.getOrThrow('attendance', 'lateThreshold'); }
  get overtimeEnabled(): Promise<boolean> { return this.settings.getOrThrow('attendance', 'overtimeEnabled'); }
}
