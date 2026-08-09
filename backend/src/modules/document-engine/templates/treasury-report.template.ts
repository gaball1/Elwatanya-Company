import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PdfEngineService } from '../../pdf-engine/application/pdf-engine.service';
import { QrCodeService } from '../../pdf-engine/application/qr-code.service';
import { BaseTemplate, TemplateParams } from './base-template';

@Injectable()
export class TreasuryReportTemplate extends BaseTemplate {
  readonly name = 'treasury_report';
  readonly displayName = 'Treasury Report';
  readonly description = 'Fund transaction report with receipts, payments, and balance';
  readonly requiresProject = true;
  readonly requiresBuilding = false;

  constructor(prisma: PrismaService, pdfEngine: PdfEngineService, qrCode: QrCodeService) {
    super(prisma, pdfEngine, qrCode);
  }

  protected getArabicTitle(): string {
    return 'تقرير الخزينة';
  }

  async buildSections(params: TemplateParams): Promise<string> {
    const fund = params.projectId
      ? await this.prisma.projectFund.findUnique({ where: { projectId: params.projectId } })
      : null;
    const transactions = fund
      ? await this.prisma.fundTransaction.findMany({
          where: { fundId: fund.id },
          orderBy: { date: 'desc' },
          take: 100,
        })
      : [];

    const receipts = transactions.filter(t => t.type === 'INCOME');
    const payments = transactions.filter(t => t.type === 'EXPENSE');
    const totalReceipts = receipts.reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalPayments = payments.reduce((s, t) => s + Number(t.amount || 0), 0);

    return `
      ${this.kpiRow([
        { label: 'Current Balance', value: `${Number(fund?.currentBalance || 0).toLocaleString()} EGP`, color: '#1e40af' },
        { label: 'Receipts', value: `${totalReceipts.toLocaleString()} EGP`, color: '#059669' },
        { label: 'Payments', value: `(${totalPayments.toLocaleString()}) EGP`, color: '#dc2626' },
      ])}
      ${this.card('Cash Flow Summary', this.table(
        ['Description', 'Amount'],
        [
          ['Initial Balance', `${Number(fund?.initialBalance || 0).toLocaleString()} EGP`],
          ['Total Receipts', `${totalReceipts.toLocaleString()} EGP`],
          ['Total Payments', `(${totalPayments.toLocaleString()} EGP)`],
          ['Current Balance', `${Number(fund?.currentBalance || 0).toLocaleString()} EGP`],
        ],
      ))}
      ${receipts.length > 0 ? this.card('Recent Receipts', this.table(
        ['Date', 'Description', 'Category', 'Amount'],
        receipts.slice(0, 10).map(t => [new Date(t.date).toLocaleDateString('en-CA'), t.description || '', t.category || '', `${Number(t.amount || 0).toLocaleString()} EGP`]),
      )) : ''}
      ${payments.length > 0 ? this.card('Recent Payments', this.table(
        ['Date', 'Description', 'Category', 'Amount'],
        payments.slice(0, 10).map(t => [new Date(t.date).toLocaleDateString('en-CA'), t.description || '', t.category || '', `(${Number(t.amount || 0).toLocaleString()} EGP)`]),
      )) : ''}
      ${this.note(`Treasury report. ${transactions.length} transactions recorded.`)}
    `;
  }

  async buildExecutiveSummary(params: TemplateParams): Promise<string> {
    const fund = params.projectId
      ? await this.prisma.projectFund.findUnique({ where: { projectId: params.projectId } })
      : null;
    return `<p>Treasury report. Current balance: <strong>${Number(fund?.currentBalance || 0).toLocaleString()} EGP</strong>.</p>`;
  }
}
