import { createHash } from 'crypto';
import { PdfDocument, PdfDocumentProps, PdfSignature } from '../../pdf-engine/domain/pdf-document.entity';
import { PrismaService } from '@/prisma/prisma.service';
import { PdfEngineService } from '../../pdf-engine/application/pdf-engine.service';
import { QrCodeService } from '../../pdf-engine/application/qr-code.service';

export interface TemplateParams {
  projectId?: string;
  buildingId?: string;
  contractorId?: string;
  documentNumber?: string;
  [key: string]: any;
}

export interface TemplateResult {
  filename: string;
  mimeType: string;
  buffer: Buffer;
}

export abstract class BaseTemplate {
  abstract readonly name: string;
  abstract readonly displayName: string;
  abstract readonly description: string;
  abstract readonly requiresProject: boolean;
  abstract readonly requiresBuilding: boolean;

  readonly category: string = 'general';

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly pdfEngine: PdfEngineService,
    protected readonly qrCode: QrCodeService,
  ) {}

  abstract buildSections(params: TemplateParams): Promise<string>;
  abstract buildExecutiveSummary(params: TemplateParams): Promise<string>;

  async generate(params: TemplateParams): Promise<TemplateResult> {
    const company = await this.prisma.company.findFirst();
    const project = params.projectId
      ? await this.prisma.project.findUnique({ where: { id: params.projectId } })
      : null;

    const docNumber = params.documentNumber || `${this.name.toUpperCase()}-${Date.now()}`;
    const sectionsHtml = await this.buildSections(params);
    const executiveHtml = await this.buildExecutiveSummary(params);
    const title = this.displayName;
    const arabicTitle = this.getArabicTitle();
    const signatures = this.getSignatures(params, company);
    const generatedAt = new Date();
    const generatedBy = params.generatedBy || 'System';
    const version = '1.0';

    const canonical = JSON.stringify({
      documentNumber: docNumber,
      title,
      arabicTitle,
      version,
      generatedBy,
      generatedAt: generatedAt.toISOString(),
      company: {
        name: company?.name || '',
        arabicName: company?.arabicName || '',
        taxNumber: company?.taxNumber || '',
      },
      project: project ? { id: project.id, name: project.name } : null,
      signatures,
      sections: sectionsHtml,
    });
    const verificationHash = createHash('sha256').update(canonical).digest('hex');

    const verifyUrl = `${process.env.APP_URL || 'http://localhost:3001'}/api/v1/verify/document/${docNumber}`;
    const qrData = await this.qrCode.generateDataUrl(verifyUrl);

    await this.prisma.document.create({
      data: {
        title,
        documentNumber: docNumber,
        category: this.category,
        status: 'final',
        content: sectionsHtml,
        variables: params as any,
        entityType: project ? 'project' : params.entityType || null,
        entityId: project ? project.id : params.entityId || null,
        version: 1,
        verificationHash,
      },
    });

    const docProps: PdfDocumentProps = {
      title,
      arabicTitle,
      documentNumber: docNumber,
      version,
      generatedBy,
      generatedAt,
      sections: [
        { title: 'Executive Summary', content: executiveHtml },
        { title: 'Details', content: sectionsHtml },
      ],
      signatures,
      watermark: company?.watermark || 'EL WATANIYA',
      orientation: 'portrait',
      pageSize: 'A4',
      qrData,
      verificationHash,
    };

    return this.pdfEngine.render(PdfDocument.create(docProps));
  }

  getSignatures(_params: TemplateParams, company?: any): PdfSignature[] {
    const signatureImage = company?.signature || '';
    return [
      { label: 'Prepared By', name: '______________', date: '______________', imageUrl: signatureImage },
      { label: 'Reviewed By', name: '______________', date: '______________', imageUrl: signatureImage },
      { label: 'Approved By', name: '______________', date: '______________', imageUrl: signatureImage },
    ];
  }

  protected abstract getArabicTitle(): string;

  protected card(title: string, content: string, color?: string): string {
    return `<div class="card" style="border-right: 4px solid ${color || '#1e40af'};">
      <div class="card-title">${title}</div>
      <div class="card-content">${content}</div>
    </div>`;
  }

  protected statCard(label: string, value: string, color?: string): string {
    return `<div class="stat-card" style="border-top: 3px solid ${color || '#1e40af'};">
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
    </div>`;
  }

  protected kpiRow(items: { label: string; value: string; color?: string }[]): string {
    return `<div class="kpi-row">${items.map((i) => this.statCard(i.label, i.value, i.color)).join('')}</div>`;
  }

  protected table(headers: string[], rows: string[][], totals?: string[]): string {
    const headerRow = headers.map((h) => `<th>${h}</th>`).join('');
    const bodyRows = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
    const totalRow = totals ? `<tr class="total-row">${totals.map((t) => `<td><strong>${t}</strong></td>`).join('')}</tr>` : '';
    return `<table><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}${totalRow}</tbody></table>`;
  }

  protected note(text: string): string {
    return `<div class="note">${text}</div>`;
  }

  protected sectionBreak(): string {
    return `<div class="section-break"></div>`;
  }
}
