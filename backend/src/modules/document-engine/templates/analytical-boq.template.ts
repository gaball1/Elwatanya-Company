import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PdfEngineService } from '../../pdf-engine/application/pdf-engine.service';
import { QrCodeService } from '../../pdf-engine/application/qr-code.service';
import { BaseTemplate, TemplateParams } from './base-template';

@Injectable()
export class AnalyticalBoqTemplate extends BaseTemplate {
  readonly name = 'analytical_boq';
  readonly displayName = 'Analytical Bill of Quantities';
  readonly description = 'Detailed analytical breakdown of BOQ items with unit prices and totals';
  readonly requiresProject = true;
  readonly requiresBuilding = true;

  constructor(prisma: PrismaService, pdfEngine: PdfEngineService, qrCode: QrCodeService) {
    super(prisma, pdfEngine, qrCode);
  }

  protected getArabicTitle(): string {
    return 'جدول الكميات التحليلي';
  }

  async buildSections(params: TemplateParams): Promise<string> {
    const items = params.buildingId
      ? await this.prisma.analyticalBoqItem.findMany({
          where: { buildingId: params.buildingId },
          orderBy: { itemCode: 'asc' },
        })
      : [];

    const totalQty = items.reduce((s, i) => s + Number(i.quantity || 0), 0);
    const total = items.reduce((s, i) => s + Number(i.totalValue || 0), 0);

    return `
      ${this.kpiRow([
        { label: 'Total Items', value: items.length.toString(), color: '#1e40af' },
        { label: 'Total Quantity', value: totalQty.toLocaleString(), color: '#0891b2' },
        { label: 'Grand Total', value: `${total.toLocaleString()} EGP`, color: '#059669' },
      ])}
      ${this.card('Analytical Items', this.table(
        ['Item Code', 'Description', 'Unit', 'Quantity', 'Unit Price', 'Total'],
        items.map((i) => [i.itemCode, i.description || '', i.unit || '', Number(i.quantity || 0).toLocaleString(), `${Number(i.unitPrice || 0).toLocaleString()}`, `${Number(i.totalValue || 0).toLocaleString()} EGP`]),
        ['', '', '', '', 'Grand Total', `${total.toLocaleString()} EGP`],
      ))}
      ${this.note('Analytical BOQ provides detailed cost breakdown per item.')}
    `;
  }

  async buildExecutiveSummary(params: TemplateParams): Promise<string> {
    const items = params.buildingId
      ? await this.prisma.analyticalBoqItem.findMany({ where: { buildingId: params.buildingId } })
      : [];
    const total = items.reduce((s, i) => s + Number(i.totalValue || 0), 0);
    return `<p>Analytical BOQ with <strong>${items.length} items</strong> totaling <strong>${total.toLocaleString()} EGP</strong>.</p>`;
  }
}
