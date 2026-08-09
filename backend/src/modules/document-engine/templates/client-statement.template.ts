import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PdfEngineService } from '../../pdf-engine/application/pdf-engine.service';
import { QrCodeService } from '../../pdf-engine/application/qr-code.service';
import { BaseTemplate, TemplateParams } from './base-template';

@Injectable()
export class ClientStatementTemplate extends BaseTemplate {
  readonly name = 'client_statement';
  readonly displayName = 'Client Statement';
  readonly description = 'Monthly client statement showing contract value, work done, deductions, and amount due';
  readonly requiresProject = true;
  readonly requiresBuilding = false;

  constructor(prisma: PrismaService, pdfEngine: PdfEngineService, qrCode: QrCodeService) {
    super(prisma, pdfEngine, qrCode);
  }

  protected getArabicTitle(): string {
    return 'كشف حساب عميل';
  }

  async buildSections(params: TemplateParams): Promise<string> {
    const statement = params.statementId
      ? await this.prisma.clientStatement.findUnique({ where: { id: params.statementId } })
      : null;
    if (!statement) return '<p>No client statement found.</p>';

    const items: any[] = (statement.items as any[]) || [];
    const deductions: any[] = (statement.deductions as any[]) || [];
    const totalWork = items.reduce((s, i) => s + Number(i.totalValue || i.amount || 0), 0);
    const totalDed = deductions.reduce((s, d) => s + Number(d.amount || 0), 0);
    const netDue = totalWork - totalDed;

    return `
      ${this.kpiRow([
        { label: 'Client', value: statement.clientName || 'N/A', color: '#1e40af' },
        { label: 'Work Value', value: `${Number(statement.totalWorkValue || totalWork).toLocaleString()} EGP`, color: '#0891b2' },
        { label: 'Deductions', value: `(${Number(statement.totalDeductions || totalDed).toLocaleString()}) EGP`, color: '#dc2626' },
        { label: 'Net Payable', value: `${Number(statement.netPayable || netDue).toLocaleString()} EGP`, color: '#059669' },
      ])}
      ${items.length > 0 ? this.card('Statement Items', this.table(
        ['Description', 'Amount'],
        items.map((i: any) => [i.description || i.itemCode || '', `${Number(i.totalValue || i.amount || 0).toLocaleString()} EGP`]),
      )) : ''}
      ${deductions.length > 0 ? this.card('Deductions', this.table(
        ['Description', 'Amount'],
        deductions.map((d: any) => [d.description || d.type || '', `(${Number(d.amount || 0).toLocaleString()} EGP)`]),
      )) : ''}
      ${this.card('Payment Reconciliation', this.table(
        ['Item', 'Amount'],
        [
          ['Total Work Value', `${Number(statement.totalWorkValue || totalWork).toLocaleString()} EGP`],
          ['Total Deductions', `(${Number(statement.totalDeductions || totalDed).toLocaleString()} EGP)`],
          ['Net Amount Due', `${Number(statement.netPayable || netDue).toLocaleString()} EGP`],
        ],
      ))}
      ${this.note(`Client statement #${statement.statementNumber} dated ${new Date(statement.date).toLocaleDateString('en-CA')}.`)}
    `;
  }

  async buildExecutiveSummary(params: TemplateParams): Promise<string> {
    const s = params.statementId
      ? await this.prisma.clientStatement.findUnique({ where: { id: params.statementId } })
      : null;
    return `<p>Client statement for <strong>${s?.clientName || 'N/A'}</strong> — Net payable: <strong>${Number(s?.netPayable || 0).toLocaleString()} EGP</strong>. Status: ${s?.status || 'N/A'}.</p>`;
  }
}
