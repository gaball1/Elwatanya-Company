import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PdfEngineService } from '../../pdf-engine/application/pdf-engine.service';
import { QrCodeService } from '../../pdf-engine/application/qr-code.service';
import { BaseTemplate, TemplateParams } from './base-template';

@Injectable()
export class ContractorBoqTemplate extends BaseTemplate {
  readonly name = 'contractor_boq';
  readonly displayName = 'Contractor Bill of Quantities';
  readonly description = 'Subcontractor BOQ with allocated items, rates, and values';
  readonly requiresProject = true;
  readonly requiresBuilding = true;

  constructor(prisma: PrismaService, pdfEngine: PdfEngineService, qrCode: QrCodeService) {
    super(prisma, pdfEngine, qrCode);
  }

  protected getArabicTitle(): string {
    return 'جدول كميات المقاول';
  }

  async buildSections(params: TemplateParams): Promise<string> {
    const boqs = params.buildingId
      ? await this.prisma.contractorBoq.findMany({
          where: { buildingId: params.buildingId },
        })
      : [];
    const items = boqs.length > 0
      ? await this.prisma.contractorBoqItem.findMany({
          where: { contractorBoqId: { in: boqs.map(b => b.id) } },
          orderBy: { itemCode: 'asc' },
        })
      : [];

    const total = items.reduce((s, i) => s + Number(i.totalValue || 0), 0);
    const totalQty = items.reduce((s, i) => s + Number(i.quantity || 0), 0);

    return `
      ${this.kpiRow([
        { label: 'Contractor BOQs', value: boqs.length.toString(), color: '#1e40af' },
        { label: 'Items', value: items.length.toString(), color: '#0891b2' },
        { label: 'Allocated Qty', value: totalQty.toLocaleString(), color: '#d97706' },
        { label: 'Total Value', value: `${total.toLocaleString()} EGP`, color: '#059669' },
      ])}
      ${this.card('Contractor BOQ Items', this.table(
        ['Item Code', 'Description', 'Unit', 'Quantity', 'Unit Price', 'Total'],
        items.map((i) => [i.itemCode, i.description || '', i.unit || '', Number(i.quantity || 0).toLocaleString(), `${Number(i.unitPrice || 0).toLocaleString()}`, `${Number(i.totalValue || 0).toLocaleString()} EGP`]),
        ['', '', '', '', 'Grand Total', `${total.toLocaleString()} EGP`],
      ))}
      ${this.note('This Contractor BOQ defines the scope, quantities, and rates agreed with the subcontractor.')}
    `;
  }

  async buildExecutiveSummary(params: TemplateParams): Promise<string> {
    const boqs = params.buildingId
      ? await this.prisma.contractorBoq.findMany({ where: { buildingId: params.buildingId } })
      : [];
    const items = boqs.length > 0
      ? await this.prisma.contractorBoqItem.findMany({ where: { contractorBoqId: { in: boqs.map(b => b.id) } } })
      : [];
    const total = items.reduce((s, i) => s + Number(i.totalValue || 0), 0);
    return `<p>Contractor BOQ: <strong>${items.length} items</strong> totaling <strong>${total.toLocaleString()} EGP</strong> across ${boqs.length} BOQ(s).</p>`;
  }
}
