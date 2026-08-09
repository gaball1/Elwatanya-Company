import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { SETTING_REPOSITORY } from './domain/setting.repository';
import { PrismaSettingRepository } from './infrastructure/prisma-setting.repository';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import {
  CompanySettings,
  BrandingSettings,
  ThemeSettings,
  FinanceSettings,
  AttendanceSettings,
  AISettings,
  ReportingSettings,
  SecuritySettings,
  EmailSettings,
} from './accessors';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [SettingsController],
  providers: [
    { provide: SETTING_REPOSITORY, useClass: PrismaSettingRepository },
    SettingsService,
    CompanySettings,
    BrandingSettings,
    ThemeSettings,
    FinanceSettings,
    AttendanceSettings,
    AISettings,
    ReportingSettings,
    SecuritySettings,
    EmailSettings,
  ],
  exports: [
    SettingsService,
    CompanySettings,
    BrandingSettings,
    ThemeSettings,
    FinanceSettings,
    AttendanceSettings,
    AISettings,
    ReportingSettings,
    SecuritySettings,
    EmailSettings,
  ],
})
export class SettingsModule {}
