import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PdfEngineService } from '../../pdf-engine/application/pdf-engine.service';
import { QrCodeService } from '../../pdf-engine/application/qr-code.service';
import { BaseTemplate, TemplateParams } from './base-template';

@Injectable()
export class SubcontractorStatementTemplate extends BaseTemplate {
  readonly name = 'subcontractor_statement';
  readonly displayName = 'Subcontractor Statement';
  readonly description = 'Monthly statement for subcontractor with executed quantities and payment details';
  readonly requiresProject = true;
  readonly requiresBuilding = false;

  constructor(prisma: PrismaService, pdfEngine: PdfEngineService, qrCode: QrCodeService) {
    super(prisma, pdfEngine, qrCode);
  }

  protected getArabicTitle(): string {
    return 'كشف حساب مقاول باطن';
  }

  async buildSections(params: TemplateParams): Promise<string> {
    const statement = params.statementId
      ? await this.prisma.subcontractorStatement.findUnique({ where: { id: params.statementId } })
      : null;
    if (!statement) return '<p>No subcontractor statement found.</p>';

    const items: any[] = (statement.items as any[]) || [];
    const deductions: any[] = (statement.deductions as any[]) || [];

    return `
      ${this.kpiRow([
        { label: 'Subcontractor', value: statement.subcontractorName || 'N/A', color: '#1e40af' },
        { label: 'Work Value', value: `${Number(statement.totalWorkValue || 0).toLocaleString()} EGP`, color: '#0891b2' },
        { label: 'Insurance', value: `(${Number(statement.totalInsurance || 0).toLocaleString()}) EGP`, color: '#d97706' },
        { label: 'Net Payable', value: `${Number(statement.netPayable || 0).toLocaleString()} EGP`, color: '#059669' },
      ])}
      ${items.length > 0 ? this.card('Executed Quantities', this.table(
        ['Description', 'Unit', 'Quantity', 'Rate', 'Total'],
        items.map((i: any) => [i.description || i.itemCode || '', i.unit || '', Number(i.quantity || 0).toLocaleString(), `${Number(i.rate || i.unitPrice || 0).toLocaleString()}`, `${Number(i.totalValue || i.amount || 0).toLocaleString()} EGP`]),
      )) : ''}
      ${deductions.length > 0 ? this.card('Deductions', this.table(
        ['Type', 'Amount'],
        deductions.map((d: any) => [d.description || d.type || '', `(${Number(d.amount || 0).toLocaleString()} EGP)`]),
      )) : ''}
      ${this.card('Payment Summary', this.table(
        ['Item', 'Amount'],
        [
          ['Total Work Value', `${Number(statement.totalWorkValue || 0).toLocaleString()} EGP`],
          ['Insurance', `(${Number(statement.totalInsurance || 0).toLocaleString()} EGP)`],
          ['Previous Paid', `(${Number(statement.previousPaid || 0).toLocaleString()} EGP)`],
          ['Net Payable', `${Number(statement.netPayable || 0).toLocaleString()} EGP`],
        ],
      ))}
      ${this.note(`Subcontractor statement #${statement.statementNumber} — ${statement.workType}.`)}
    `;
  }

  async buildExecutiveSummary(params: TemplateParams): Promise<string> {
    const s = params.statementId
      ? await this.prisma.subcontractorStatement.findUnique({ where: { id: params.statementId } })
      : null;
    return `<p>Subcontractor statement for <strong>${s?.subcontractorName || 'N/A'}</strong> — Net payable: <strong>${Number(s?.netPayable || 0).toLocaleString()} EGP</strong>.</p>`;
  }
}
