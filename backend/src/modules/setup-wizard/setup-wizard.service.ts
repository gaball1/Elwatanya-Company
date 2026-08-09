import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaSetupStateRepository } from './infrastructure/prisma-setup-state.repository';
import { SettingsService } from '../settings/settings.service';
import { SetupState } from './domain/setup-state.entity';
import { SetupStep } from './domain/setup-step.enum';
import { CompanyInfoDto } from './dto/company-info.dto';
import { BrandingDto } from './dto/branding.dto';
import { FinanceDefaultsDto } from './dto/finance-defaults.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { WorkScheduleDto } from './dto/work-schedule.dto';
import { PrismaService } from '@/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SetupWizardService implements OnModuleInit {
  private readonly logger = new Logger(SetupWizardService.name);
  private state: SetupState | null = null;

  constructor(
    private readonly repository: PrismaSetupStateRepository,
    private readonly settingsService: SettingsService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.state = await this.repository.getState();
    if (!this.state) {
      this.state = SetupState.create();
      await this.repository.save(this.state);
    }
  }

  async getStatus(): Promise<{ isSetup: boolean; currentStep?: SetupStep }> {
    const isSetup = await this.settingsService.get<boolean>('company', 'isSetup');
    if (isSetup) return { isSetup: true };
    return { isSetup: false, currentStep: this.state?.currentStep };
  }

  async saveCompanyInfo(dto: CompanyInfoDto): Promise<void> {
    await this.settingsService.setGroup('company', {
      name: dto.name,
      arabicName: dto.arabicName,
      logo: dto.logo ?? '',
      favicon: dto.favicon ?? '',
      address: dto.address ?? '',
      phone: dto.phone ?? '',
      email: dto.email ?? '',
      taxNumber: dto.taxNumber ?? '',
      commercialRegister: dto.commercialRegister ?? '',
      currency: dto.currency ?? 'EGP',
      dateFormat: dto.dateFormat ?? 'DD/MM/YYYY',
      language: dto.language ?? 'ar',
      timeZone: dto.timeZone ?? 'Africa/Cairo',
    });
    await this.advanceStep(SetupStep.COMPANY_INFO);
  }

  async saveBranding(dto: BrandingDto): Promise<void> {
    await this.settingsService.setGroup('branding', {
      primaryColor: dto.primaryColor ?? '#1e40af',
      secondaryColor: dto.secondaryColor ?? '#64748b',
      logoUrl: dto.logoUrl ?? '',
      faviconUrl: dto.faviconUrl ?? '',
      watermark: dto.watermark ?? '',
      qrCodeUrl: dto.qrCodeUrl ?? '',
      stampUrl: dto.stampUrl ?? '',
      digitalStampUrl: dto.digitalStampUrl ?? '',
      signatureUrl: dto.signatureUrl ?? '',
    });
    await this.advanceStep(SetupStep.BRANDING);
  }

  async saveFinance(dto: FinanceDefaultsDto): Promise<void> {
    await this.settingsService.setGroup('finance', {
      defaultInsurancePercent: dto.defaultInsurancePercent ?? 5,
      maxInsurancePercent: dto.maxInsurancePercent ?? 10,
      taxRate: dto.taxRate ?? 0,
      decimalPlaces: dto.decimalPlaces ?? 2,
    });
    await this.advanceStep(SetupStep.FINANCE);
  }

  async createAdmin(dto: CreateAdminDto): Promise<string> {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        role: 'CEO',
        status: 'ACTIVE',
      },
    });
    await this.advanceStep(SetupStep.ADMINISTRATOR);
    return user.id;
  }

  async saveSchedule(dto: WorkScheduleDto): Promise<void> {
    await this.settingsService.setGroup('attendance', {
      checkInTime: dto.checkInTime ?? '08:00',
      checkOutTime: dto.checkOutTime ?? '17:00',
      overtimeEnabled: dto.overtimeEnabled ?? true,
    });
    await this.settingsService.set('reporting', 'timezone', dto.timezone ?? 'Africa/Cairo');
    await this.advanceStep(SetupStep.SCHEDULE);
  }

  async completeSetup(): Promise<void> {
    await this.settingsService.set('company', 'isSetup', true);
    this.logger.log('Company setup completed successfully');
  }

  private async advanceStep(step: SetupStep): Promise<void> {
    if (!this.state) return;
    this.state.completeStep(step);
    await this.repository.save(this.state);
  }
}
