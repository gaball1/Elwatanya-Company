import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { PdfEngineService } from './application/pdf-engine.service';
import { PdfDocument } from './domain/pdf-document.entity';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RequirePermission } from '@/common/decorators/permissions.decorator';
import { Permissions } from '@/common/constants/permissions.constant';
import { sendFileResponse } from '@/common/pdf-header.util';
import { assertSafeUrl } from '@/common/utils/ssrf-guard.util';
import { RenderPdfDto } from './dto/render-pdf.dto';

@ApiTags('PDF Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pdf')
export class PdfEngineController {
  constructor(private readonly service: PdfEngineService) {}

  @Post('render')
  @ApiOperation({ summary: 'Render a PDF document from JSON definition' })
  @RequirePermission(Permissions.Files.Read)
  async render(@Body() body: RenderPdfDto, @Res() res: Response) {
    // SSRF guard: reject any internal/private URL embedded in the document
    // (logo, watermark, signatures) before it reaches the headless renderer.
    const urlsToCheck: string[] = [
      body.logoUrl ?? '',
      body.watermark ?? '',
      ...(body.signatures ?? []).map((s) => s.imageUrl ?? ''),
    ];
    for (const url of urlsToCheck) {
      if (/^https?:\/\//.test(url)) {
        await assertSafeUrl(url);
      }
    }

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
