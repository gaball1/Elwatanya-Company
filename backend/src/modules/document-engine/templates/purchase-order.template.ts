import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PdfEngineService } from '../../pdf-engine/application/pdf-engine.service';
import { QrCodeService } from '../../pdf-engine/application/qr-code.service';
import { BaseTemplate, TemplateParams } from './base-template';

@Injectable()
export class PurchaseOrderTemplate extends BaseTemplate {
  readonly name = 'purchase_order';
  readonly displayName = 'Purchase Order';
  readonly description = 'Official purchase order with itemized materials, quantities, prices, and delivery terms';
  readonly requiresProject = true;
  readonly requiresBuilding = false;

  constructor(prisma: PrismaService, pdfEngine: PdfEngineService, qrCode: QrCodeService) {
    super(prisma, pdfEngine, qrCode);
  }

  protected getArabicTitle(): string {
    return 'أمر شراء';
  }

  async buildSections(params: TemplateParams): Promise<string> {
    const purchases = params.projectId
      ? await this.prisma.purchase.findMany({
          where: { projectId: params.projectId },
          orderBy: { date: 'desc' },
          take: 50,
        })
      : [];

    const totalAmount = purchases.reduce((s, p) => s + Number(p.total || 0), 0);
    const pending = purchases.filter(p => p.status === 'pending').length;

    return `
      ${this.kpiRow([
        { label: 'Orders', value: purchases.length.toString(), color: '#1e40af' },
        { label: 'Pending', value: pending.toString(), color: '#d97706' },
        { label: 'Total Amount', value: `${totalAmount.toLocaleString()} EGP`, color: '#059669' },
      ])}
      ${this.card('Purchase Orders', this.table(
        ['Item', 'Supplier', 'Qty', 'Unit', 'Unit Price', 'Total', 'Status'],
        purchases.map(p => [p.itemName, p.supplierName || 'N/A', Number(p.quantity || 0).toLocaleString(), p.unit || '', `${Number(p.unitPrice || 0).toLocaleString()}`, `${Number(p.total || 0).toLocaleString()} EGP`, p.status || 'N/A']),
        ['', '', '', '', '', 'Total', `${totalAmount.toLocaleString()} EGP`],
      ))}
      ${this.note('Purchase orders listed for the project. Pending orders require approval.')}
    `;
  }

  async buildExecutiveSummary(params: TemplateParams): Promise<string> {
    const purchases = params.projectId
      ? await this.prisma.purchase.findMany({ where: { projectId: params.projectId } })
      : [];
    const total = purchases.reduce((s, p) => s + Number(p.total || 0), 0);
    return `<p><strong>${purchases.length}</strong> purchase orders totaling <strong>${total.toLocaleString()} EGP</strong>.</p>`;
  }
}
