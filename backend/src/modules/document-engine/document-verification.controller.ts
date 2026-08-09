import { Controller, Get, Param, Res, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../../common/decorators/auth.decorators';
import { DocumentEngineService } from './document-engine.service';
import { PrismaService } from '@/prisma/prisma.service';

@ApiTags('Document Verification')
@Public()
@Controller('verify')
export class DocumentVerificationController {
  constructor(
    private readonly service: DocumentEngineService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('document/:documentNumber/json')
  @ApiOperation({ summary: 'Verify a document and return metadata as JSON (public)' })
  async verifyJson(@Param('documentNumber') documentNumber: string) {
    const doc = await this.service.getDocumentByNumber(documentNumber);
    const company = await this.prisma.company.findFirst();
    return {
      document: this.toPublicPayload(doc, company),
      company: company
        ? {
            name: company.name,
            arabicName: company.arabicName,
            website: company.website,
            email: company.email,
            phone: company.phone,
          }
        : null,
      verificationStatus: 'verified',
    };
  }

  @Get('document/:documentNumber')
  @ApiOperation({ summary: 'Public verification page opened by the QR code' })
  async verifyPage(@Param('documentNumber') documentNumber: string, @Res() res: Response) {
    let doc: any;
    let company: any;
    try {
      doc = await this.service.getDocumentByNumber(documentNumber);
      company = await this.prisma.company.findFirst();
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
      }
      throw err;
    }

    const payload = this.toPublicPayload(doc, company);
    const verified = Boolean(payload.verificationHash) && payload.status === 'final';
    const verifiedClass = verified ? 'verified' : 'invalid';
    const verifiedText = verified ? 'Verified' : 'Not Verified';
    const companyName = company?.name || 'El Wataniya';
    const companyArabic = company?.arabicName || 'الوطنية';

    const hashShort = payload.verificationHash ? `${payload.verificationHash.slice(0, 8)}…${payload.verificationHash.slice(-8)}` : '—';
    const createdAt = payload.createdAt ? new Date(payload.createdAt).toLocaleDateString('en-CA') : '—';

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Document Verification | ${this.esc(companyName)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', 'Traditional Arabic', system-ui, sans-serif; background: #f1f5f9; color: #1e293b; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
  .card { background: #ffffff; border-radius: 16px; max-width: 560px; width: 100%; overflow: hidden; box-shadow: 0 10px 40px rgba(30, 58, 95, 0.12); border-top: 6px solid #1e40af; }
  .head { background: #1e40af; color: #fff; padding: 28px 28px 20px; text-align: center; }
  .head h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
  .head p { font-size: 13px; opacity: 0.85; }
  .body { padding: 24px 28px 28px; }
  .badge { display: inline-flex; align-items: center; gap: 8px; padding: 8px 18px; border-radius: 999px; font-weight: 700; font-size: 13px; margin: 0 auto 22px; width: fit-content; }
  .badge.verified { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
  .badge.invalid { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
  .badge::before { content: '✓'; font-weight: 800; }
  .badge.invalid::before { content: '✕'; }
  .row { display: flex; justify-content: space-between; gap: 16px; padding: 12px 0; border-bottom: 1px solid #eef2f7; font-size: 14px; }
  .row .label { color: #64748b; }
  .row .value { font-weight: 600; text-align: left; word-break: break-all; }
  .hash { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; font-family: Consolas, monospace; font-size: 12px; color: #475569; margin-top: 18px; direction: ltr; text-align: left; }
  .foot { background: #f8fafc; padding: 16px 28px; text-align: center; font-size: 12px; color: #94a3b8; }
</style>
</head>
<body>
  <div class="card">
    <div class="head">
      <h1>${this.esc(companyName)}</h1>
      <p>${this.esc(companyArabic)} — التحقق الرقمي من الوثيقة</p>
    </div>
    <div class="body">
      <div class="badge ${verifiedClass}">${verifiedText}</div>
      <div class="row"><span class="label">Document Number</span><span class="value">${this.esc(payload.documentNumber)}</span></div>
      <div class="row"><span class="label">Document Title</span><span class="value">${this.esc(payload.title)}</span></div>
      <div class="row"><span class="label">Version</span><span class="value">${this.esc(String(payload.version))}</span></div>
      <div class="row"><span class="label">Created By</span><span class="value">${this.esc(payload.generatedBy || 'System')}</span></div>
      <div class="row"><span class="label">Created Date</span><span class="value">${this.esc(createdAt)}</span></div>
      <div class="row"><span class="label">Status</span><span class="value">${this.esc(payload.status)}</span></div>
      <div class="row"><span class="label">Digital Verification</span><span class="value">${verifiedText}</span></div>
      <div class="hash">SHA-256: ${this.esc(hashShort)}</div>
    </div>
    <div class="foot">${this.esc(companyName)} | Digital Document Verification Portal</div>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  private toPublicPayload(doc: any, _company: any) {
    const variables = doc.variables || {};
    return {
      id: doc.id,
      documentNumber: doc.documentNumber || '',
      title: doc.title,
      category: doc.category,
      status: doc.status,
      version: doc.version,
      generatedBy: variables.generatedBy || 'System',
      createdAt: doc.createdAt,
      verificationHash: doc.verificationHash || null,
      entityType: doc.entityType,
      entityId: doc.entityId,
    };
  }

  private esc(text: string): string {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
