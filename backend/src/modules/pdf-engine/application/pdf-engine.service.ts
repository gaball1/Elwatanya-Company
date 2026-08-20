import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PdfDocument, PdfSignature } from '../domain/pdf-document.entity';
import { PdfRendererService } from './pdf-renderer.service';
import { isUnsafeUrl } from '@/common/utils/ssrf-guard.util';
import { sanitizeHtmlFragment } from '@/common/utils/html-sanitize.util';

export interface PdfResult {
  filename: string;
  mimeType: string;
  buffer: Buffer;
}

interface Branding {
  name: string;
  arabicName: string;
  logo: string;
  address: string;
  phone: string;
  email: string;
  taxNumber: string;
  primaryColor: string;
  secondaryColor: string;
  stamp: string;
  watermark: string;
}

const DEFAULT_BRANDING: Branding = {
  name: '',
  arabicName: '',
  logo: '',
  address: '',
  phone: '',
  email: '',
  taxNumber: '',
  primaryColor: '#1e40af',
  secondaryColor: '#64748b',
  stamp: '',
  watermark: '',
};

@Injectable()
export class PdfEngineService {
  private readonly logger = new Logger(PdfEngineService.name);
  private activeRenders = 0;
  private readonly maxConcurrentRenders = Number(process.env.PDF_MAX_CONCURRENT_RENDERS) || 4;

  constructor(
    private readonly prisma: PrismaService,
    private readonly renderer: PdfRendererService,
  ) {}

  async render(document: PdfDocument): Promise<PdfResult> {
    if (this.activeRenders >= this.maxConcurrentRenders) {
      throw new ServiceUnavailableException(
        `PDF rendering is busy (${this.activeRenders}/${this.maxConcurrentRenders} active). Please retry shortly.`,
      );
    }
    this.activeRenders += 1;
    try {
      return await this.doRender(document);
    } finally {
      this.activeRenders -= 1;
    }
  }

  private async doRender(document: PdfDocument): Promise<PdfResult> {
    const company = await this.prisma.company.findFirst();
    const branding: Branding = { ...DEFAULT_BRANDING, ...(company || {}) };
    const baseUrl = process.env.APP_URL || 'http://localhost:3001';

    const dir = document.locale === 'en' ? 'ltr' : 'rtl';
    const isRtl = dir === 'rtl';

    const html = this.buildHtml(document, branding, dir, isRtl);
    const headerFooter = this.buildHeaderFooter(document, branding, baseUrl, isRtl);

    const buffer = await this.renderer.renderToPdf(html, {
      format: (document.pageSize as any) || 'A4',
      orientation: (document.orientation as any) || 'portrait',
      baseUrl,
      header: headerFooter,
    });

    const timestamp = document.generatedAt.toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `${document.documentNumber || document.title.replace(/\s+/g, '_')}_${timestamp}.pdf`;

    return { filename, mimeType: 'application/pdf', buffer };
  }

  private buildHeaderFooter(
    doc: PdfDocument,
    brand: Branding,
    baseUrl: string,
    isRtl: boolean,
  ): { headerTemplate: string; footerTemplate: string } {
    const pageWord = isRtl ? 'صفحة' : 'Page';
    const ofWord = isRtl ? 'من' : 'of';

    // Company branding (logo top-left + name/address/phone/email) is rendered
    // once in the body `.document-header`; keep the repeating page header a
    // thin separator so branding never appears duplicated on the page.
    const headerTemplate = `<div style="width:100%;border-bottom:0.5pt solid #e2e8f0;font-size:0;line-height:0;"></div>`;

    const footerTemplate = `<div style="width:100%;font-size:0;direction:ltr;">
  <table style="width:100%;border-collapse:collapse;font-family:'Segoe UI','Traditional Arabic',Arial,sans-serif;">
    <tr>
      <td style="text-align:left;font-size:8px;color:#94a3b8;">${this.escapeHtml(doc.documentNumber || doc.title)}</td>
      <td style="text-align:right;font-size:8px;color:#94a3b8;">${pageWord} <span class="pageNumber"></span> ${ofWord} <span class="totalPages"></span></td>
    </tr>
  </table>
</div>`;

    return { headerTemplate, footerTemplate };
  }

  private buildHtml(doc: PdfDocument, brand: Branding, dir: 'ltr' | 'rtl', isRtl: boolean): string {
    const sections = doc.sections.map((s) => this.buildSection(s)).join('\n');
    const signaturesHtml = doc.signatures?.length ? this.buildSignatures(doc.signatures) : '';
    const stampUrl = this.resolveAssetUrl(brand.stamp, '');
    const stampHtml = stampUrl
      ? `<div class="stamp-block"><img src="${stampUrl}" alt="Stamp"></div>`
      : '';
    const signaturesSection = signaturesHtml || stampHtml
      ? `<div class="signatures-section${stampHtml ? ' has-stamp' : ''}">${signaturesHtml}${stampHtml}</div>`
      : '';

    const watermarkText = doc.watermark || brand.watermark;
    const watermarkIsImage = watermarkText && this.isImagePath(watermarkText);
    const watermarkCss = watermarkText && !watermarkIsImage
      ? `.watermark::after { content: "${this.escapeCss(watermarkText)}"; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 70px; font-weight: 600; opacity: 0.05; color: ${brand.primaryColor}; white-space: nowrap; pointer-events: none; z-index: 500; }`
      : '';
    const watermarkImageHtml = watermarkText && watermarkIsImage
      ? `<div class="watermark-img"><img src="${this.resolveAssetUrl(watermarkText, '')}" alt="Watermark"></div>`
      : '';

    const logoUrl = this.resolveAssetUrl(doc.logoUrl || brand.logo, '');
    const logoHtml = logoUrl
      ? `<div class="header-logo"><img src="${logoUrl}" alt="Logo"></div>`
      : '';

    const titleText = isRtl ? (doc.arabicTitle || doc.title) : doc.title;
    const subTitle = doc.subtitle || (isRtl ? (doc.title !== doc.arabicTitle ? doc.title : '') : (doc.arabicTitle || ''));
    const dateText = doc.generatedAt.toLocaleDateString(isRtl ? 'ar-EG' : 'en-CA');
    const docMeta = [
      doc.documentNumber ? { k: isRtl ? 'رقم المستند' : 'Document No.', v: doc.documentNumber } : null,
      doc.version ? { k: isRtl ? 'الإصدار' : 'Version', v: doc.version } : null,
      { k: isRtl ? 'إعداد' : 'Generated By', v: doc.generatedBy },
      { k: isRtl ? 'التاريخ' : 'Date', v: dateText },
    ].filter(Boolean).map((m: any) => `<span class="meta-badge"><span class="meta-key">${this.escapeHtml(m.k)}</span> ${this.escapeHtml(m.v)}</span>`).join('');

    return `<!DOCTYPE html>
<html dir="${dir}">
<head><meta charset="utf-8">
<title>${this.escapeHtml(doc.title)}</title>
<style>
  @page { size: ${doc.pageSize || 'A4'} ${doc.orientation || 'portrait'}; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', 'Traditional Arabic', 'Arabic Typesetting', 'Amiri', system-ui, sans-serif;
    color: #1e293b;
    line-height: 1.6;
    margin: 0;
    padding: 0;
    font-size: 13px;
  }
  .watermark { position: relative; min-height: 100vh; }${watermarkCss}

  /* ---------- Header ---------- */
  .document-header {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 8px 0 14px;
    border-bottom: 3px solid ${brand.primaryColor};
    margin-bottom: 18px;
    direction: ltr;
  }
  .header-logo { flex: 0 0 auto; direction: ltr; }
  .header-logo img { max-height: 60px; max-width: 180px; object-fit: contain; }
  .header-company {
    flex: 1 1 auto;
    text-align: ${isRtl ? 'right' : 'left'};
    direction: ${isRtl ? 'rtl' : 'ltr'};
  }
  .header-company h1 {
    font-size: 20px;
    margin: 0 0 4px;
    color: ${brand.primaryColor};
    font-weight: 800;
  }
  .header-company .company-meta { font-size: 10px; color: #64748b; line-height: 1.5; }
  .doc-title {
    text-align: center;
    margin: 0 0 24px;
    padding-bottom: 14px;
    border-bottom: 1px solid #e2e8f0;
  }
  .doc-title h2 {
    font-size: 20px;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
    letter-spacing: 0.2px;
  }
  .doc-title .subtitle { font-size: 14px; color: #475569; margin-top: 4px; }
  .doc-meta { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 12px; }
  .meta-badge {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    padding: 3px 10px;
    border-radius: 6px;
    font-size: 10px;
    color: #334155;
    white-space: nowrap;
  }
  .meta-key { color: #64748b; font-weight: 600; }

  /* ---------- Sections ---------- */
  .section { margin: 18px 0; page-break-inside: avoid; }
  .section-break { page-break-inside: auto; }
  .section-title {
    color: ${brand.primaryColor};
    font-size: 15px;
    font-weight: 700;
    padding-bottom: 6px;
    margin-bottom: 10px;
    border-bottom: 2px solid ${brand.primaryColor};
  }
  .section-content { font-size: 13px; }

  /* ---------- Enterprise tables ---------- */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
    font-size: 12px;
    table-layout: fixed;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th {
    background: ${brand.primaryColor};
    color: #ffffff;
    padding: 8px 10px;
    text-align: ${isRtl ? 'right' : 'left'};
    font-weight: 700;
    border: 1px solid ${brand.primaryColor};
    vertical-align: middle;
    letter-spacing: 0.2px;
  }
  td {
    padding: 7px 10px;
    border: 1px solid #d1d5db;
    vertical-align: top;
  }
  tbody tr:nth-child(even) { background: #f8fafc; }
  tbody tr:nth-child(odd) { background: #ffffff; }
  tbody tr:hover { background: #eef2f7; }
  .num, td.num { text-align: right; direction: ltr; font-variant-numeric: tabular-nums; }
  .total-row td { background: ${brand.secondaryColor}; color: #ffffff; font-weight: 700; border-color: ${brand.secondaryColor}; }

  /* ---------- QR / verification ---------- */
  .qr-container { text-align: center; margin: 20px 0; }
  .qr-container img { max-width: 120px; max-height: 120px; }
  .verify-bar { text-align: center; font-size: 10px; color: #64748b; margin-top: 6px; word-break: break-all; }

  /* ---------- Watermark ---------- */
  .watermark-img {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-45deg);
    opacity: 0.05;
    pointer-events: none;
    z-index: 500;
  }
  .watermark-img img { max-width: 700px; max-height: 700px; }

  /* ---------- Signatures & stamp ---------- */
  .signatures-section {
    margin-top: 48px;
    page-break-inside: avoid;
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
  }
  .signatures {
    display: flex;
    flex-wrap: wrap;
    gap: 32px;
  }
  .signature-box {
    min-width: 180px;
    text-align: center;
    padding-top: 12px;
  }
  .signature-box .label {
    font-size: 11px;
    font-weight: 600;
    color: #334155;
    margin-bottom: 6px;
  }
  .signature-box .name {
    font-weight: 600;
    font-size: 13px;
    color: #1e293b;
    margin-top: 8px;
    border-top: 1px solid #94a3b8;
    padding-top: 6px;
  }
  .signature-box .date { font-size: 10px; color: #94a3b8; margin-top: 4px; }
  .signature-box img { max-height: 48px; max-width: 140px; object-fit: contain; margin: 6px 0; }
  .signature-box .no-img { height: 40px; }
  .stamp-block { flex: 0 0 auto; align-self: flex-end; }
  .stamp-block img { max-height: 84px; max-width: 140px; object-fit: contain; opacity: 0.85; }

  .page-break { page-break-before: always; }
  @media print { .no-print { display: none; } }
</style></head>
<body class="watermark">

<div class="document-header">
  ${logoHtml}
  <div class="header-company">
    <h1>${this.escapeHtml(isRtl ? (brand.arabicName || brand.name) : (brand.name || brand.arabicName))}</h1>
    <div class="company-meta">
      ${brand.address ? this.escapeHtml(brand.address) + '<br>' : ''}
      ${brand.phone ? this.escapeHtml(brand.phone) : ''}${brand.email ? ' • ' + this.escapeHtml(brand.email) : ''}
      ${brand.taxNumber ? '<br>' + (isRtl ? 'الرقم الضريبي: ' : 'Tax No.: ') + this.escapeHtml(brand.taxNumber) : ''}
    </div>
  </div>
</div>

<div class="doc-title">
  <h2>${this.escapeHtml(titleText)}</h2>
  ${subTitle ? `<div class="subtitle">${this.escapeHtml(subTitle)}</div>` : ''}
  ${docMeta ? `<div class="doc-meta">${docMeta}</div>` : ''}
</div>

${watermarkImageHtml}

${sections}

${signaturesSection}

</body></html>`;
  }

  private buildSection(section: any): string {
    // section.content is untrusted HTML (from user-authored statements); it is
    // sanitized here before the headless renderer parses it (SSRF/XSS guard).
    const safeContent = sanitizeHtmlFragment(String(section.content ?? ''));
    return `<div class="section${section.breakInside ? ' section-break' : ''}">
      ${section.title ? `<div class="section-title">${this.escapeHtml(section.title)}</div>` : ''}
      <div class="section-content"${section.columns ? ` style="column-count:${section.columns}"` : ''}>${safeContent}</div>
    </div>`;
  }

  private buildSignatures(signatures: PdfSignature[]): string {
    const boxes = signatures.map((s) => `
      <div class="signature-box">
        <div class="label">${this.escapeHtml(s.label)}</div>
        ${s.imageUrl ? `<img src="${this.resolveAssetUrl(s.imageUrl, '')}" alt="Signature">` : '<div class="no-img"></div>'}
        <div class="name">${s.name || '&nbsp;'}</div>
        <div class="date">${s.date || '&nbsp;'}</div>
      </div>
    `).join('');
    return `<div class="signatures">${boxes}</div>`;
  }

  /**
   * Resolves a stored asset reference to a fetchable URL.
   * Legacy stored URLs use the JWT-protected /api/v1/files/download/:id route,
   * which the headless renderer cannot authenticate; rewrite to the public route.
   * Absolute http(s) URLs are rejected when they target private/internal hosts
   * (SSRF defence-in-depth; the controller performs full validation too).
   */
  private resolveAssetUrl(value: string, baseUrl: string): string {
    if (!value) return '';
    if (/^(https?:\/\/)/.test(value)) {
      if (isUnsafeUrl(value)) {
        this.logger.warn(`Blocked unsafe asset URL in PDF render: ${value.slice(0, 120)}`);
        return '';
      }
      return value;
    }
    if (/^data:image\//.test(value)) return value;
    const path = value.replace(/^\/api\/v1\/files\/download\//, '/api/v1/files/public/');
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return baseUrl ? `${baseUrl}${normalized}` : normalized;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private escapeCss(text: string): string {
    return text.replace(/["\\]/g, '\\$&').replace(/\n/g, '\\A ');
  }

  private isImagePath(value: string): boolean {
    return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/api/') || value.startsWith('data:image/');
  }
}
