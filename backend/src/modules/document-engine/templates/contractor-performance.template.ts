import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PdfEngineService } from '../../pdf-engine/application/pdf-engine.service';
import { QrCodeService } from '../../pdf-engine/application/qr-code.service';
import { BaseTemplate, TemplateParams } from './base-template';

@Injectable()
export class ContractorPerformanceTemplate extends BaseTemplate {
  readonly name = 'contractor_performance';
  readonly displayName = 'Contractor Performance Report';
  readonly description = 'Report on subcontractor contracts, BOQ status, and payment history';
  readonly requiresProject = true;
  readonly requiresBuilding = false;

  constructor(prisma: PrismaService, pdfEngine: PdfEngineService, qrCode: QrCodeService) {
    super(prisma, pdfEngine, qrCode);
  }

  protected getArabicTitle(): string {
    return 'تقرير أداء المقاول';
  }

  async buildSections(params: TemplateParams): Promise<string> {
    const subcontractors = await this.prisma.subcontractor.findMany({
      orderBy: { name: 'asc' },
    });
    const boqs = await this.prisma.contractorBoq.findMany();
    const statements = await this.prisma.statement.findMany();

    const activeSubs = subcontractors.filter(s => s.status === 'active').length;

    return `
      ${this.kpiRow([
        { label: 'Subcontractors', value: subcontractors.length.toString(), color: '#1e40af' },
        { label: 'Active', value: activeSubs.toString(), color: '#059669' },
        { label: 'BOQs', value: boqs.length.toString(), color: '#0891b2' },
        { label: 'Statements', value: statements.length.toString(), color: '#7c3aed' },
      ])}
      ${this.card('Subcontractors', this.table(
        ['Name', 'Work Type', 'Status', 'Margin'],
        subcontractors.map(s => [s.name, s.workType || '', s.status || '', `${s.marginValue || 0}%`]),
      ))}
      ${boqs.length > 0 ? this.card('Contractor BOQs', this.table(
        ['ID', 'Status', 'Version'],
        boqs.map(b => [b.id.slice(0, 8), b.status || '', b.version.toString()]),
      )) : ''}
      ${this.note('Subcontractor performance is tracked through BOQ completion rates and statement payment history.')}
    `;
  }

  async buildExecutiveSummary(params: TemplateParams): Promise<string> {
    const subs = await this.prisma.subcontractor.findMany();
    const statements = await this.prisma.statement.findMany();
    const totalPaid = statements.reduce((s, st) => s + Number(st.netPayable || 0), 0);
    return `<p><strong>${subs.length}</strong> subcontractors, <strong>${statements.length}</strong> statements totaling <strong>${totalPaid.toLocaleString()} EGP</strong>.</p>`;
  }
}
