import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PdfEngineService } from '../../pdf-engine/application/pdf-engine.service';
import { QrCodeService } from '../../pdf-engine/application/qr-code.service';
import { BaseTemplate, TemplateParams } from './base-template';

@Injectable()
export class BoqAnalysisTemplate extends BaseTemplate {
  readonly name = 'boq_analysis';
  readonly displayName = 'BOQ Analysis Report';
  readonly description = 'Comparative analysis of BOQ versions - employer vs analytical vs final vs contractor';
  readonly requiresProject = true;
  readonly requiresBuilding = true;

  constructor(prisma: PrismaService, pdfEngine: PdfEngineService, qrCode: QrCodeService) {
    super(prisma, pdfEngine, qrCode);
  }

  protected getArabicTitle(): string {
    return 'تقرير تحليل جداول الكميات';
  }

  async buildSections(params: TemplateParams): Promise<string> {
    const bid = params.buildingId;
    if (!bid) return '<p>No building selected for BOQ analysis.</p>';

    const employerItems = await this.prisma.employerBoqItem.findMany({ where: { buildingId: bid } });
    const analyticalItems = await this.prisma.analyticalBoqItem.findMany({ where: { buildingId: bid } });
    const contractorBoqs = await this.prisma.contractorBoq.findMany({ where: { buildingId: bid } });
    let contractorItems: number = 0;
    let contractorTotal: number = 0;
    if (contractorBoqs.length > 0) {
      const items = await this.prisma.contractorBoqItem.findMany({
        where: { contractorBoqId: { in: contractorBoqs.map(b => b.id) } },
      });
      contractorItems = items.length;
      contractorTotal = items.reduce((s, i) => s + Number(i.totalValue || 0), 0);
    }

    const employerTotal = employerItems.reduce((s, i) => s + Number(i.totalValue || 0), 0);
    const analyticalTotal = analyticalItems.reduce((s, i) => s + Number(i.totalValue || 0), 0);

    return `
      ${this.kpiRow([
        { label: 'Employer BOQ', value: `${employerTotal.toLocaleString()} EGP`, color: '#1e40af' },
        { label: 'Analytical', value: `${analyticalTotal.toLocaleString()} EGP`, color: '#0891b2' },
        { label: 'Contractor', value: `${contractorTotal.toLocaleString()} EGP`, color: '#7c3aed' },
      ])}
      ${this.card('Comparative Analysis', this.table(
        ['BOQ Type', 'Items', 'Total Value'],
        [
          ['Employer BOQ', employerItems.length.toString(), `${employerTotal.toLocaleString()} EGP`],
          ['Analytical BOQ', analyticalItems.length.toString(), `${analyticalTotal.toLocaleString()} EGP`],
          ['Contractor BOQ', contractorItems.toString(), `${contractorTotal.toLocaleString()} EGP`],
        ],
        ['Totals', (employerItems.length + analyticalItems.length + contractorItems).toString(), `${(employerTotal + analyticalTotal + contractorTotal).toLocaleString()} EGP`],
      ))}
      ${this.note('BOQ Analysis provides comparison across employer, analytical, and contractor BOQ versions for cost control.')}
    `;
  }

  async buildExecutiveSummary(params: TemplateParams): Promise<string> {
    const bid = params.buildingId;
    if (!bid) return '<p>No building selected.</p>';
    const employer = await this.prisma.employerBoqItem.findMany({ where: { buildingId: bid } });
    const analytical = await this.prisma.analyticalBoqItem.findMany({ where: { buildingId: bid } });
    const eTotal = employer.reduce((s, i) => s + Number(i.totalValue || 0), 0);
    const aTotal = analytical.reduce((s, i) => s + Number(i.totalValue || 0), 0);
    return `<p>BOQ Analysis: Employer <strong>${eTotal.toLocaleString()} EGP</strong> | Analytical <strong>${aTotal.toLocaleString()} EGP</strong>.</p>`;
  }
}
