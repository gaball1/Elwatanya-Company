import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PdfEngineService } from '../../pdf-engine/application/pdf-engine.service';
import { QrCodeService } from '../../pdf-engine/application/qr-code.service';
import { BaseTemplate, TemplateParams } from './base-template';

@Injectable()
export class FinancialReportTemplate extends BaseTemplate {
  readonly name = 'financial_report';
  readonly displayName = 'Financial Report';
  readonly description = 'Project financial report with revenues, costs, and profitability analysis';
  readonly requiresProject = true;
  readonly requiresBuilding = false;

  constructor(prisma: PrismaService, pdfEngine: PdfEngineService, qrCode: QrCodeService) {
    super(prisma, pdfEngine, qrCode);
  }

  protected getArabicTitle(): string {
    return 'التقرير المالي';
  }

  async buildSections(params: TemplateParams): Promise<string> {
    const project = params.projectId
      ? await this.prisma.project.findUnique({ where: { id: params.projectId } })
      : null;
    const clientStatements = params.projectId
      ? await this.prisma.clientStatement.findMany({ where: { projectId: params.projectId } })
      : [];
    const purchases = params.projectId
      ? await this.prisma.purchase.findMany({ where: { projectId: params.projectId } })
      : [];
    const miscExpenses = params.projectId
      ? await this.prisma.miscellaneous.findMany({ where: { projectId: params.projectId } })
      : [];

    const totalRevenue = clientStatements.reduce((s, st) => s + Number(st.netPayable || 0), 0);
    const totalPurchases = purchases.reduce((s, p) => s + Number(p.total || 0), 0);
    const totalMisc = miscExpenses.reduce((s, m) => s + Number(m.amount || 0), 0);
    const totalCosts = totalPurchases + totalMisc;
    const grossProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0';

    return `
      ${this.kpiRow([
        { label: 'Revenue', value: `${totalRevenue.toLocaleString()} EGP`, color: '#059669' },
        { label: 'Costs', value: `${totalCosts.toLocaleString()} EGP`, color: '#dc2626' },
        { label: 'Gross Profit', value: `${grossProfit.toLocaleString()} EGP`, color: grossProfit >= 0 ? '#059669' : '#dc2626' },
        { label: 'Margin', value: `${profitMargin}%`, color: grossProfit >= 0 ? '#059669' : '#dc2626' },
      ])}
      ${this.card('Financial Summary', this.table(
        ['Category', 'Amount'],
        [
          ['Total Revenue (Client Statements)', `${totalRevenue.toLocaleString()} EGP`],
          ['Total Purchases', `(${totalPurchases.toLocaleString()} EGP)`],
          ['Miscellaneous Expenses', `(${totalMisc.toLocaleString()} EGP)`],
          ['Total Costs', `(${totalCosts.toLocaleString()} EGP)`],
          ['Gross Profit', `${grossProfit.toLocaleString()} EGP`],
          ['Profit Margin', `${profitMargin}%`],
        ],
      ))}
      ${clientStatements.length > 0 ? this.card('Client Statements (Revenue)', this.table(
        ['Number', 'Client', 'Date', 'Net Payable'],
        clientStatements.map(st => [st.statementNumber || 'N/A', st.clientName || 'N/A', new Date(st.date).toLocaleDateString('en-CA'), `${Number(st.netPayable || 0).toLocaleString()} EGP`]),
        ['', '', 'Total Revenue', `${totalRevenue.toLocaleString()} EGP`],
      )) : ''}
      ${this.note(`Financial report for ${project?.name || 'N/A'}. Profit margin: ${profitMargin}%.`)}
    `;
  }

  async buildExecutiveSummary(params: TemplateParams): Promise<string> {
    const project = params.projectId
      ? await this.prisma.project.findUnique({ where: { id: params.projectId } })
      : null;
    const stmts = params.projectId
      ? await this.prisma.clientStatement.findMany({ where: { projectId: params.projectId } })
      : [];
    const purchases = params.projectId
      ? await this.prisma.purchase.findMany({ where: { projectId: params.projectId } })
      : [];
    const misc = params.projectId
      ? await this.prisma.miscellaneous.findMany({ where: { projectId: params.projectId } })
      : [];
    const rev = stmts.reduce((s, st) => s + Number(st.netPayable || 0), 0);
    const cost = purchases.reduce((s, p) => s + Number(p.total || 0), 0) + misc.reduce((s, m) => s + Number(m.amount || 0), 0);
    const gp = rev - cost;
    const margin = rev > 0 ? ((gp / rev) * 100).toFixed(1) : '0';
    return `<p>Financial report: Revenue <strong>${rev.toLocaleString()} EGP</strong> | Costs <strong>${cost.toLocaleString()} EGP</strong> | Profit <strong>${gp.toLocaleString()} EGP (${margin}%)</strong>.</p>`;
  }
}
