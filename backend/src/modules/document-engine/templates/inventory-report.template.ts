import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PdfEngineService } from '../../pdf-engine/application/pdf-engine.service';
import { QrCodeService } from '../../pdf-engine/application/qr-code.service';
import { BaseTemplate, TemplateParams } from './base-template';

@Injectable()
export class InventoryReportTemplate extends BaseTemplate {
  readonly name = 'inventory_report';
  readonly displayName = 'Inventory Report';
  readonly description = 'Stock status report with current quantities, valuation, and low stock alerts';
  readonly requiresProject = false;
  readonly requiresBuilding = false;

  constructor(prisma: PrismaService, pdfEngine: PdfEngineService, qrCode: QrCodeService) {
    super(prisma, pdfEngine, qrCode);
  }

  protected getArabicTitle(): string {
    return 'تقرير المخزون';
  }

  async buildSections(params: TemplateParams): Promise<string> {
    const items = await this.prisma.inventoryItem.findMany({
      orderBy: { name: 'asc' },
    });

    const totalValue = items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.price || 0), 0);
    const lowStock = items.filter(i => Number(i.quantity || 0) <= Number(i.minQuantity || 0));
    const outOfStock = items.filter(i => Number(i.quantity || 0) === 0);

    return `
      ${this.kpiRow([
        { label: 'Total Items', value: items.length.toString(), color: '#1e40af' },
        { label: 'Total Value', value: `${totalValue.toLocaleString()} EGP`, color: '#059669' },
        { label: 'Low Stock', value: lowStock.length.toString(), color: '#d97706' },
        { label: 'Out of Stock', value: outOfStock.length.toString(), color: '#dc2626' },
      ])}
      ${lowStock.length > 0 ? this.card('Low Stock Alerts', this.table(
        ['Item', 'Current Qty', 'Min Qty', 'Price', 'Status'],
        lowStock.map(i => [i.name, Number(i.quantity || 0).toString(), Number(i.minQuantity || 0).toString(), `${Number(i.price || 0).toLocaleString()} EGP`, Number(i.quantity || 0) === 0 ? 'Out of Stock' : 'Low']),
      )) : ''}
      ${this.card('Inventory List', this.table(
        ['Item', 'Code', 'Unit', 'Quantity', 'Price', 'Total Value'],
        items.map(i => [i.name, i.code, i.unit || '', Number(i.quantity || 0).toLocaleString(), `${Number(i.price || 0).toLocaleString()}`, `${(Number(i.quantity || 0) * Number(i.price || 0)).toLocaleString()} EGP`]),
        ['', '', '', '', 'Total Value', `${totalValue.toLocaleString()} EGP`],
      ))}
      ${this.note(`Inventory valuation based on current stock levels and unit prices. ${lowStock.length} items below minimum threshold.`)}
    `;
  }

  async buildExecutiveSummary(params: TemplateParams): Promise<string> {
    const items = await this.prisma.inventoryItem.findMany();
    const totalVal = items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.price || 0), 0);
    const low = items.filter(i => Number(i.quantity || 0) <= Number(i.minQuantity || 0)).length;
    return `<p>Inventory: <strong>${items.length} items</strong>, valued at <strong>${totalVal.toLocaleString()} EGP</strong>. ${low} items low stock.</p>`;
  }
}
