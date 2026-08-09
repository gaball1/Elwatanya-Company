import { Module, Global } from '@nestjs/common';
import { DocumentNumberController } from './document-number.controller';
import { DocumentNumberService } from './application/document-number.service';
import { SettingsModule } from '../settings/settings.module';

@Global()
@Module({
  imports: [SettingsModule],
  controllers: [DocumentNumberController],
  providers: [DocumentNumberService],
  exports: [DocumentNumberService],
})
export class DocumentNumberModule {}
