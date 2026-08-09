import { Controller, Post, Body, Res, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { PdfEngineService } from './application/pdf-engine.service';
import { PdfDocument } from './domain/pdf-document.entity';
import { Public } from '@/common/decorators/auth.decorators';
import { sendFileResponse } from '@/common/pdf-header.util';

@ApiTags('PDF Engine')
@Controller('pdf')
export class PdfEngineController {
  constructor(private readonly service: PdfEngineService) {}

  @Public()
  @Post('render')
  @ApiOperation({ summary: 'Render a PDF document from JSON definition' })
  async render(@Body() body: any, @Res() res: Response) {
    const doc = PdfDocument.create({
      title: body.title,
      arabicTitle: body.arabicTitle,
      documentNumber: body.documentNumber,
      version: body.version,
      generatedBy: body.generatedBy || 'System',
      generatedAt: body.generatedAt ? new Date(body.generatedAt) : new Date(),
      sections: body.sections || [],
      signatures: body.signatures,
      watermark: body.watermark,
      orientation: body.orientation,
      pageSize: body.pageSize,
      qrData: body.qrData,
      locale: body.locale,
      logoUrl: body.logoUrl,
    });

    const result = await this.service.render(doc);
    sendFileResponse(res, result.buffer, result.filename, result.mimeType, 'attachment');
  }
}
