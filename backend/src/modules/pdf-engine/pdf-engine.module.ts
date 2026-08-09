import { Module, Global } from '@nestjs/common';
import { PdfEngineController } from './pdf-engine.controller';
import { PdfEngineService } from './application/pdf-engine.service';
import { PdfRendererService } from './application/pdf-renderer.service';
import { QrCodeService } from './application/qr-code.service';

@Global()
@Module({
  controllers: [PdfEngineController],
  providers: [PdfEngineService, PdfRendererService, QrCodeService],
  exports: [PdfEngineService, PdfRendererService, QrCodeService],
})
export class PdfEngineModule {}
