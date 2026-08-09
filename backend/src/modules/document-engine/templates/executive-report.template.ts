import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PdfEngineService } from '../../pdf-engine/application/pdf-engine.service';
import { QrCodeService } from '../../pdf-engine/application/qr-code.service';
import { BaseTemplate, TemplateParams } from './base-template';

@Injectable()
export class ExecutiveReportTemplate extends BaseTemplate {
  readonly name = 'executive_report';
  readonly displayName = 'Executive Report';
  readonly description = 'High-level executive dashboard combining project KPIs, financial health, and progress status';
  readonly requiresProject = true;
  readonly requiresBuilding = false;

  constructor(prisma: PrismaService, pdfEngine: PdfEngineService, qrCode: QrCodeService) {
    super(prisma, pdfEngine, qrCode);
  }

  protected getArabicTitle(): string {
    return 'التقرير التنفيذي';
  }

  async buildSections(params: TemplateParams): Promise<string> {
    const project = params.projectId
      ? await this.prisma.project.findUnique({ where: { id: params.projectId } })
      : null;
    const buildings = params.projectId
      ? await this.prisma.building.findMany({ where: { projectId: params.projectId } })
      : [];
    const employees = await this.prisma.employee.findMany();
    const clientStatements = params.projectId
      ? await this.prisma.clientStatement.findMany({ where: { projectId: params.projectId } })
      : [];
    const purchases = params.projectId
      ? await this.prisma.purchase.findMany({ where: { projectId: params.projectId } })
      : [];

    const revenue = clientStatements.reduce((s, st) => s + Number(st.netPayable || 0), 0);
    const costs = purchases.reduce((s, p) => s + Number(p.total || 0), 0);
    const profit = revenue - costs;
    const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : '0';
    const activeEmployees = employees.filter(e => e.status === 'active').length;

    return `
      ${this.kpiRow([
        { label: 'Project Status', value: project?.status || 'N/A', color: '#1e40af' },
        { label: 'Progress', value: `${project?.progress || 0}%`, color: '#059669' },
        { label: 'Revenue', value: `${revenue.toLocaleString()} EGP`, color: '#0891b2' },
        { label: 'Margin', value: `${margin}%`, color: profit >= 0 ? '#059669' : '#dc2626' },
      ])}
      <div class="section">
        <div class="section-title">Executive Summary</div>
        <div class="section-content">
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:12px">
            ${this.statCard('Buildings', buildings.length.toString(), '#0891b2')}
            ${this.statCard('Active Staff', activeEmployees.toString(), '#7c3aed')}
            ${this.statCard('Profit', `${profit.toLocaleString()} EGP`, profit >= 0 ? '#059669' : '#dc2626')}
          </div>
        </div>
      </div>
      ${this.card('Financial Health', this.table(
        ['Metric', 'Value'],
        [
          ['Total Revenue', `${revenue.toLocaleString()} EGP`],
          ['Total Costs', `(${costs.toLocaleString()} EGP)`],
          ['Net Profit', `${profit.toLocaleString()} EGP`],
          ['Profit Margin', `${margin}%`],
        ],
      ))}
      ${this.note(`Executive report for ${project?.name || 'N/A'}. Overall health: ${profit >= 0 && (project?.progress || 0) >= 50 ? 'Positive' : 'Monitor'}.`)}
    `;
  }

  async buildExecutiveSummary(params: TemplateParams): Promise<string> {
    const project = params.projectId
      ? await this.prisma.project.findUnique({ where: { id: params.projectId } })
      : null;
    return `<p><strong>Executive Report</strong> — <strong>${project?.name || 'N/A'}</strong> — Progress: <strong>${project?.progress || 0}%</strong> — Status: <strong>${project?.status || 'N/A'}</strong>.</p>`;
  }
}
