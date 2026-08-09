import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PdfEngineService } from '../../pdf-engine/application/pdf-engine.service';
import { QrCodeService } from '../../pdf-engine/application/qr-code.service';
import { BaseTemplate, TemplateParams } from './base-template';

@Injectable()
export class PaymentVoucherTemplate extends BaseTemplate {
  readonly name = 'payment_voucher';
  readonly displayName = 'Payment Voucher';
  readonly description = 'Payment records with payee details, amounts, and status';
  readonly requiresProject = true;
  readonly requiresBuilding = false;

  constructor(prisma: PrismaService, pdfEngine: PdfEngineService, qrCode: QrCodeService) {
    super(prisma, pdfEngine, qrCode);
  }

  protected getArabicTitle(): string {
    return 'سند صرف';
  }

  async buildSections(params: TemplateParams): Promise<string> {
    const payments = await this.prisma.payment.findMany({
      orderBy: { paidAt: 'desc' },
      take: 50,
    });

    const totalAmount = payments.reduce((s, p) => s + Number(p.amount || 0), 0);

    return `
      ${this.kpiRow([
        { label: 'Payments', value: payments.length.toString(), color: '#1e40af' },
        { label: 'Total Amount', value: `${totalAmount.toLocaleString()} EGP`, color: '#059669' },
      ])}
      ${this.card('Payment Vouchers', this.table(
        ['Date', 'Amount', 'Notes'],
        payments.map(p => [new Date(p.paidAt).toLocaleDateString('en-CA'), `${Number(p.amount || 0).toLocaleString()} EGP`, p.notes || '']),
        ['', 'Total', `${totalAmount.toLocaleString()} EGP`],
      ))}
      ${this.note(`Total payments recorded: ${totalAmount.toLocaleString()} EGP.`)}
    `;
  }

  async buildExecutiveSummary(params: TemplateParams): Promise<string> {
    const payments = await this.prisma.payment.findMany();
    const total = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    return `<p><strong>${payments.length}</strong> payments totaling <strong>${total.toLocaleString()} EGP</strong>.</p>`;
  }
}
