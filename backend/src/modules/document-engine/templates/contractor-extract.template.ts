import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PdfEngineService } from '../../pdf-engine/application/pdf-engine.service';
import { QrCodeService } from '../../pdf-engine/application/qr-code.service';
import { BaseTemplate, TemplateParams } from './base-template';

@Injectable()
export class ContractorExtractTemplate extends BaseTemplate {
  readonly name = 'contractor_extract';
  readonly displayName = 'Contractor Extract';
  readonly description = 'Monthly progress extract (statement) for contractor with quantities executed and amounts due';
  readonly requiresProject = true;
  readonly requiresBuilding = false;

  constructor(prisma: PrismaService, pdfEngine: PdfEngineService, qrCode: QrCodeService) {
    super(prisma, pdfEngine, qrCode);
  }

  protected getArabicTitle(): string {
    return 'مستخلص مقاول';
  }

  async buildSections(params: TemplateParams): Promise<string> {
    const statement = params.statementId
      ? await this.prisma.statement.findUnique({
          where: { id: params.statementId },
          include: { items: true },
        })
      : null;
    const items = (statement?.items || []) as any[];
    const deductions = statement?.id
      ? await this.prisma.statementDeduction.findMany({ where: { statementId: statement.id } })
      : [];

    const currentWorkValue = items.reduce((s, i) => s + Number(i.currentWorkValue || 0), 0);
    const totalDeductions = deductions.reduce((s, d) => s + Number(d.amount || 0), 0);
    const netPayable = (statement?.netPayable ? Number(statement.netPayable) : currentWorkValue - totalDeductions);

    return `
      ${this.kpiRow([
        { label: 'Sequence', value: statement?.sequenceNumber?.toString() || 'N/A', color: '#1e40af' },
        { label: 'Work Value', value: `${currentWorkValue.toLocaleString()} EGP`, color: '#0891b2' },
        { label: 'Deductions', value: `(${totalDeductions.toLocaleString()}) EGP`, color: '#dc2626' },
        { label: 'Net Payable', value: `${netPayable.toLocaleString()} EGP`, color: '#059669' },
      ])}
      ${this.card('Extract Items', this.table(
        ['Item Code', 'Description', 'Unit', 'Prev Qty', 'Current Qty', 'Total Qty', 'Unit Price', 'Current Value'],
        items.map((i: any) => [i.itemCode || '', i.description || '', i.unit || '', Number(i.previousQuantity || 0).toLocaleString(), Number(i.currentQuantity || 0).toLocaleString(), Number(i.totalQuantity || 0).toLocaleString(), `${Number(i.unitPrice || 0).toLocaleString()}`, `${Number(i.currentWorkValue || 0).toLocaleString()} EGP`]),
        ['', '', '', '', '', '', 'Total', `${currentWorkValue.toLocaleString()} EGP`],
      ))}
      ${deductions.length > 0 ? this.card('Deductions', this.table(
        ['Type', 'Amount'],
        deductions.map(d => [d.type, `${Number(d.amount).toLocaleString()} EGP`]),
      )) : ''}
      ${this.card('Payment Summary', this.table(
        ['Item', 'Amount'],
        [
          ['Total Work Value', `${currentWorkValue.toLocaleString()} EGP`],
          ['Total Deductions', `(${totalDeductions.toLocaleString()} EGP)`],
          ['Net Payable', `${netPayable.toLocaleString()} EGP`],
        ],
      ))}
      ${this.note(`Extract #${statement?.sequenceNumber || 'N/A'} dated ${statement?.extractDate ? new Date(statement.extractDate).toLocaleDateString('en-CA') : 'N/A'}.`)}
    `;
  }

  async buildExecutiveSummary(params: TemplateParams): Promise<string> {
    const statement = params.statementId
      ? await this.prisma.statement.findUnique({ where: { id: params.statementId } })
      : null;
    return `<p>Contractor extract <strong>#${statement?.sequenceNumber || 'N/A'}</strong> — Net payable: <strong>${Number(statement?.netPayable || 0).toLocaleString()} EGP</strong>. Status: ${statement?.status || 'N/A'}.</p>`;
  }
}
