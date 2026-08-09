import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PdfEngineService } from '../../pdf-engine/application/pdf-engine.service';
import { QrCodeService } from '../../pdf-engine/application/qr-code.service';
import { BaseTemplate, TemplateParams } from './base-template';

@Injectable()
export class FinalBoqTemplate extends BaseTemplate {
  readonly name = 'final_boq';
  readonly displayName = 'Final Bill of Quantities';
  readonly description = 'Finalized BOQ with approved items, versions, and final values';
  readonly requiresProject = true;
  readonly requiresBuilding = false;

  constructor(prisma: PrismaService, pdfEngine: PdfEngineService, qrCode: QrCodeService) {
    super(prisma, pdfEngine, qrCode);
  }

  protected getArabicTitle(): string {
    return 'جدول الكميات النهائي';
  }

  async buildSections(params: TemplateParams): Promise<string> {
    const boqs = params.projectId
      ? await this.prisma.finalBoq.findMany({
          where: { projectId: params.projectId },
          orderBy: { createdAt: 'desc' },
        })
      : [];
    const items = boqs.length > 0
      ? await this.prisma.finalBoqItem.findMany({ where: { finalBoqId: { in: boqs.map(b => b.id) } } })
      : [];

    const total = items.reduce((s, i) => s + Number(i.totalValue || 0), 0);
    const totalQty = items.reduce((s, i) => s + Number(i.quantity || 0), 0);

    return `
      ${this.kpiRow([
        { label: 'BOQ Versions', value: boqs.length.toString(), color: '#1e40af' },
        { label: 'Items', value: items.length.toString(), color: '#0891b2' },
        { label: 'Total Qty', value: totalQty.toLocaleString(), color: '#d97706' },
        { label: 'Final Total', value: `${total.toLocaleString()} EGP`, color: '#059669' },
      ])}
      ${boqs.map(boq => this.card(`Version ${boq.version} - ${boq.status}`, `
        <p><strong>Business Code:</strong> ${boq.businessCode}</p>
        <p><strong>Status:</strong> ${boq.status}</p>
      `)).join('')}
      ${this.card('Final BOQ Items', this.table(
        ['Business Code', 'Description', 'Unit', 'Quantity', 'Unit Price', 'Total'],
        items.map((i) => [i.businessCode, i.description || '', i.unit || '', Number(i.quantity || 0).toLocaleString(), `${Number(i.unitPrice || 0).toLocaleString()}`, `${Number(i.totalValue || 0).toLocaleString()} EGP`]),
        ['', '', '', '', 'Final Total', `${total.toLocaleString()} EGP`],
      ))}
      ${this.note('This Final BOQ incorporates all approved variations and represents the binding cost baseline.')}
    `;
  }

  async buildExecutiveSummary(params: TemplateParams): Promise<string> {
    const boqs = params.projectId
      ? await this.prisma.finalBoq.findMany({ where: { projectId: params.projectId } })
      : [];
    const count = boqs.length;
    const latest = boqs[0];
    return `<p>Final BOQ with <strong>${count} version(s)</strong>. Latest version: <strong>${latest?.version || 'N/A'}</strong> — Status: <strong>${latest?.status || 'N/A'}</strong>.</p>`;
  }
}
