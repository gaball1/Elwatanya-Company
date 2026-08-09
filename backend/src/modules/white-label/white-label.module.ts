import { Module } from '@nestjs/common';
import { WhiteLabelController } from './white-label.controller';
import { WhiteLabelService } from './white-label.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  controllers: [WhiteLabelController],
  providers: [WhiteLabelService],
  exports: [WhiteLabelService],
})
export class WhiteLabelModule {}
