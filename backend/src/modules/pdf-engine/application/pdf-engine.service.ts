import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PdfDocument, PdfSignature } from '../domain/pdf-document.entity';
import { PdfRendererService } from './pdf-renderer.service';

export interface PdfResult {
  filename: string;
  mimeType: string;
  buffer: Buffer;
}

@Injectable()
export class PdfEngineService {
  private readonly logger = new Logger(PdfEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly renderer: PdfRendererService,
  ) {}

  async render(document: PdfDocument): Promise<PdfResult> {
    const company = await this.prisma.company.findFirst();

    const html = this.buildHtml(document, company || {});

    const buffer = await this.renderer.renderToPdf(html, {
      format: (document.pageSize as any) || 'A4',
      orientation: (document.orientation as any) || 'portrait',
      baseUrl: process.env.APP_URL || 'http://localhost:3001',
    });

    const timestamp = document.generatedAt.toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `${document.documentNumber || document.title.replace(/\s+/g, '_')}_${timestamp}.pdf`;

    return { filename, mimeType: 'application/pdf', buffer };
  }

  private buildHtml(doc: PdfDocument, company: any): string {
    const sections = doc.sections.map((s) => this.buildSection(s)).join('\n');
    const signatures = doc.signatures?.length ? this.buildSignatures(doc.signatures) : '';

    const companyName = company?.name || '';
    const arabicName = company?.arabicName || '';
    const logo = doc.logoUrl || company?.smallLogo || company?.logo || '';
    const address = company?.address || '';
    const phone = company?.phone || '';
    const email = company?.email || '';
    const taxNumber = company?.taxNumber || '';
    const primaryColor = company?.primaryColor || '#1e40af';
    const secondaryColor = company?.secondaryColor || '#64748b';
    const stampUrl = company?.stamp || '';
    const watermarkText = company?.watermark || '';

    const stampHtml = stampUrl
      ? `<div class="stamp"><img src="${stampUrl}" alt="Stamp"></div>`
      : '';

    const dir = doc.locale === 'en' ? 'ltr' : 'rtl';
    const isRtl = dir === 'rtl';

    const watermarkCss = watermarkText && !this.isImagePath(watermarkText)
      ? `.watermark::after { content: "${this.escapeCss(watermarkText)}"; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80px; opacity: 0.06; color: ${primaryColor}; white-space: nowrap; pointer-events: none; z-index: 1000; }`
      : '';

    const watermarkImageHtml = watermarkText && this.isImagePath(watermarkText)
      ? `<div class="watermark-img"><img src="${watermarkText}" alt="Watermark"></div>`
      : '';

    return `<!DOCTYPE html>
<html dir="${dir}">
<head><meta charset="utf-8">
<title>${this.escapeHtml(doc.title)}</title>
<style>
  @page { size: ${doc.pageSize || 'A4'} ${doc.orientation || 'portrait'}; margin: 25mm 20mm 25mm 20mm; }
  body { font-family: 'Segoe UI', 'Traditional Arabic', 'Arabic Typesetting', system-ui, sans-serif; color: #1e293b; line-height: 1.6; margin: 0; padding: 0; }
  .watermark { position: relative; }${watermarkCss}
  .header { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 2px solid ${primaryColor}; }
  .header-logo { max-height: 50px; }
  .header-info { text-align: ${isRtl ? 'right' : 'left'}; font-size: 10px; color: #64748b; }
  .header-info strong { color: ${primaryColor}; font-size: 12px; }
  .footer { display: flex; justify-content: space-between; padding: 8px 0; border-top: 1px solid #cbd5e1; font-size: 9px; color: #94a3b8; }
  .page-number:after { content: counter(page); }
  .doc-title { text-align: center; margin: 30px 0 20px; padding-bottom: 15px; border-bottom: 3px solid ${primaryColor}; }
  .doc-title h1 { color: ${primaryColor}; font-size: 22px; margin: 0 0 5px; }
  .doc-title .arabic { color: #475569; font-size: 18px; margin: 0 0 10px; }
  .doc-meta { display: flex; flex-wrap: wrap; gap: 15px; justify-content: center; font-size: 11px; color: #64748b; margin-top: 10px; }
  .doc-meta span { background: #f1f5f9; padding: 3px 10px; border-radius: 4px; }
  .section { margin: 20px 0; page-break-inside: avoid; }
  .section-break { page-break-inside: auto; }
  .section-title { color: ${primaryColor}; font-size: 16px; font-weight: 600; padding-bottom: 8px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; }
  .section-content { font-size: 13px; }
  .section-content table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
  .section-content th { background: ${primaryColor}; color: white; padding: 8px 10px; text-align: ${isRtl ? 'right' : 'left'}; font-weight: 500; }
  .section-content td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
  .section-content tr:nth-child(even) { background: #f8fafc; }
  .qr-container { text-align: center; margin: 20px 0; }
  .qr-container img { max-width: 120px; max-height: 120px; }
  .verify-bar { text-align: center; font-size: 10px; color: #64748b; margin-top: 6px; word-break: break-all; }
  .watermark-img { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); opacity: 0.12; pointer-events: none; z-index: 999; }
  .watermark-img img { max-width: 700px; max-height: 700px; }
  .signatures { margin-top: 40px; display: flex; justify-content: space-around; flex-wrap: wrap; gap: 20px; }
  .signature-box { text-align: center; min-width: 180px; padding: 15px; border: 1px dashed #cbd5e1; border-radius: 8px; }
  .signature-box .label { font-size: 11px; color: #64748b; margin-bottom: 5px; }
  .signature-box .name { font-weight: 600; font-size: 14px; color: #1e293b; }
  .signature-box .date { font-size: 11px; color: #94a3b8; }
  .signature-box img { max-height: 50px; margin: 5px 0; }
  .stamp { text-align: center; margin-top: 20px; }
  .stamp img { max-height: 80px; opacity: 0.8; }
  @media print { .no-print { display: none; } }
  .page-break { page-break-before: always; }
</style></head>
<body class="watermark">
<div class="header">
  <div>${logo ? `<img class="header-logo" src="${logo}" alt="Logo">` : `<strong style="color:${primaryColor};font-size:16px;">${this.escapeHtml(companyName)}</strong>`}</div>
  <div class="header-info">
    <strong>${this.escapeHtml(companyName)}</strong><br>
    ${address ? this.escapeHtml(address) + '<br>' : ''}
    ${phone ? '📞 ' + this.escapeHtml(phone) : ''} ${email ? '✉ ' + this.escapeHtml(email) : ''}
    ${taxNumber ? '<br>⏹ Tax: ' + this.escapeHtml(taxNumber) : ''}
  </div>
</div>

<div class="footer">
  <span>${this.escapeHtml(companyName)} | ${this.escapeHtml(doc.title)}</span>
  <span>${doc.generatedBy} | ${doc.generatedAt.toLocaleDateString('en-CA')}</span>
  <span class="page-number">Page </span>
</div>

<div class="doc-title">
  ${doc.arabicTitle ? `<p class="arabic">${this.escapeHtml(doc.arabicTitle)}</p>` : ''}
  <h1>${this.escapeHtml(doc.title)}</h1>
  <div class="doc-meta">
    ${doc.documentNumber ? `<span>📄 ${this.escapeHtml(doc.documentNumber)}</span>` : ''}
    ${doc.version ? `<span>🔖 v${this.escapeHtml(doc.version)}</span>` : ''}
    <span>👤 ${this.escapeHtml(doc.generatedBy)}</span>
    <span>📅 ${doc.generatedAt.toLocaleDateString('en-CA')}</span>
  </div>
</div>

${doc.qrData ? `<div class="qr-container"><img src="${doc.qrData}" alt="QR Code">${doc.documentNumber && doc.verificationHash ? `<div class="verify-bar">Scan to verify • ${this.escapeHtml(doc.documentNumber)} • SHA-256 ${doc.verificationHash.slice(0, 16)}…</div>` : ''}</div>` : ''}

${watermarkImageHtml}

${sections}

${signatures}

${stampHtml}

</body></html>`;
  }

  private buildSection(section: any): string {
    return `<div class="section${section.breakInside ? ' section-break' : ''}">
      ${section.title ? `<div class="section-title">${this.escapeHtml(section.title)}</div>` : ''}
      <div class="section-content"${section.columns ? ` style="column-count:${section.columns}"` : ''}>${section.content}</div>
    </div>`;
  }

  private buildSignatures(signatures: PdfSignature[]): string {
    const boxes = signatures.map((s) => `
      <div class="signature-box">
        <div class="label">${this.escapeHtml(s.label)}</div>
        ${s.imageUrl ? `<img src="${s.imageUrl}" alt="Signature">` : '<div style="height:40px;"></div>'}
        <div class="name">${s.name || '______________'}</div>
        <div class="date">${s.date || '______________'}</div>
      </div>
    `).join('');
    return `<div class="signatures">${boxes}</div>`;
  }

  private escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  private escapeCss(text: string): string {
    return text.replace(/["\\]/g, '\\$&').replace(/\n/g, '\\A ');
  }

  private isImagePath(value: string): boolean {
    return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/api/') || value.startsWith('data:image/');
  }
}
