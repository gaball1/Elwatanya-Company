import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SetupWizardService } from './setup-wizard.service';
import { CompanyInfoDto } from './dto/company-info.dto';
import { BrandingDto } from './dto/branding.dto';
import { FinanceDefaultsDto } from './dto/finance-defaults.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { WorkScheduleDto } from './dto/work-schedule.dto';
import { RequirePermission } from '@/common/decorators/permissions.decorator';
import { Permissions } from '@/common/constants/permissions.constant';

@ApiTags('Setup Wizard')
@Controller('setup')
export class SetupWizardController {
  constructor(private readonly wizard: SetupWizardService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check if setup is complete' })
  async getStatus() {
    return this.wizard.getStatus();
  }

  @Post('company')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Step 1: Save company information' })
  @RequirePermission(Permissions.Settings.Write)
  async saveCompanyInfo(@Body() dto: CompanyInfoDto) {
    await this.wizard.saveCompanyInfo(dto);
    return { step: 'branding' };
  }

  @Post('branding')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Step 2: Save branding settings' })
  @RequirePermission(Permissions.Settings.Write)
  async saveBranding(@Body() dto: BrandingDto) {
    await this.wizard.saveBranding(dto);
    return { step: 'finance' };
  }

  @Post('finance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Step 3: Save finance defaults' })
  @RequirePermission(Permissions.Settings.Write)
  async saveFinance(@Body() dto: FinanceDefaultsDto) {
    await this.wizard.saveFinance(dto);
    return { step: 'administrator' };
  }

  @Post('administrator')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Step 4: Create initial administrator' })
  @RequirePermission(Permissions.Settings.Write)
  async createAdmin(@Body() dto: CreateAdminDto) {
    const userId = await this.wizard.createAdmin(dto);
    return { step: 'schedule', userId };
  }

  @Post('schedule')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Step 5: Save work schedule settings' })
  @RequirePermission(Permissions.Settings.Write)
  async saveSchedule(@Body() dto: WorkScheduleDto) {
    await this.wizard.saveSchedule(dto);
    return { step: 'complete' };
  }

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Step 6: Finalize setup' })
  @RequirePermission(Permissions.Settings.Write)
  async completeSetup() {
    await this.wizard.completeSetup();
    return { message: 'Setup complete', redirect: '/login' };
  }
}
