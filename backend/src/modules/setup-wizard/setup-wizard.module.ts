import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { SettingsModule } from '../settings/settings.module';
import { PrismaSetupStateRepository } from './infrastructure/prisma-setup-state.repository';
import { SetupWizardService } from './setup-wizard.service';
import { SetupWizardController } from './setup-wizard.controller';

@Module({
  imports: [PrismaModule, SettingsModule],
  controllers: [SetupWizardController],
  providers: [
    PrismaSetupStateRepository,
    SetupWizardService,
  ],
  exports: [SetupWizardService],
})
export class SetupWizardModule {}
