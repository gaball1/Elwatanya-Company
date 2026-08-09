import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PdfEngineService } from '../../pdf-engine/application/pdf-engine.service';
import { QrCodeService } from '../../pdf-engine/application/qr-code.service';
import { BaseTemplate, TemplateParams } from './base-template';

@Injectable()
export class EmployerBoqTemplate extends BaseTemplate {
  readonly name = 'employer_boq';
  readonly displayName = 'Employer Bill of Quantities';
  readonly description = 'Detailed employer bill of quantities with unit rates and totals';
  readonly requiresProject = true;
  readonly requiresBuilding = true;

  constructor(prisma: PrismaService, pdfEngine: PdfEngineService, qrCode: QrCodeService) {
    super(prisma, pdfEngine, qrCode);
  }

  protected getArabicTitle(): string {
    return 'جدول كميات صاحب العمل';
  }

  async buildSections(params: TemplateParams): Promise<string> {
    const items = params.buildingId
      ? await this.prisma.employerBoqItem.findMany({
          where: { buildingId: params.buildingId },
          orderBy: { itemCode: 'asc' },
        })
      : [];

    const total = items.reduce((s, i) => s + Number(i.totalValue || 0), 0);

    return `
      ${this.kpiRow([
        { label: 'Total Items', value: items.length.toString(), color: '#1e40af' },
        { label: 'Total Quantity', value: items.reduce((s, i) => s + Number(i.quantity || 0), 0).toLocaleString(), color: '#0891b2' },
        { label: 'Total Value', value: `${total.toLocaleString()} EGP`, color: '#059669' },
      ])}
      ${this.card('Bill of Quantities', this.table(
        ['Item Code', 'Description', 'Unit', 'Quantity', 'Unit Rate', 'Total'],
        items.map((i) => [i.itemCode, i.description || '', i.unit || '', Number(i.quantity || 0).toLocaleString(), `${Number(i.unitPrice || 0).toLocaleString()}`, `${Number(i.totalValue || 0).toLocaleString()} EGP`]),
        ['', '', '', '', 'Grand Total', `${total.toLocaleString()} EGP`],
      ))}
      ${this.note('This Employer BOQ is the official baseline for all project cost control and contractor evaluation.')}
    `;
  }

  async buildExecutiveSummary(params: TemplateParams): Promise<string> {
    const items = params.buildingId
      ? await this.prisma.employerBoqItem.findMany({ where: { buildingId: params.buildingId } })
      : [];
    const total = items.reduce((s, i) => s + Number(i.totalValue || 0), 0);
    const categories = [...new Set(items.map((i) => i.itemCode?.split('-')[0] || 'General'))];

    return `
      <p>This document represents the official Employer Bill of Quantities for the referenced project. It contains <strong>${items.length} items</strong> across <strong>${categories.length} categories</strong> with a total estimated value of <strong>${total.toLocaleString()} EGP</strong>.</p>
      <p>The BOQ serves as the contractual baseline for all tendering, procurement, and progress measurement activities.</p>
    `;
  }
}
