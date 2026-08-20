import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ProjectAccounting {
  projectId: string;
  projectName: string;
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  totalPaymentsReceived: number;
  totalPaymentsMade: number;
  netCashFlow: number;
}

export interface AccountingDashboard {
  projectSummaries: ProjectAccounting[];
  totals: {
    totalRevenue: number;
    totalCosts: number;
    grossProfit: number;
    totalPaymentsReceived: number;
    totalPaymentsMade: number;
    netCashFlow: number;
  };
  currency: string;
}

@Injectable()
export class AccountingService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(): Promise<AccountingDashboard> {
    const projects = await this.prisma.project.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
    });

    const projectSummaries: ProjectAccounting[] = await Promise.all(
      projects.map((project) => this.getProjectAccounting(project.id, project.name)),
    );

    const totals = {
      totalRevenue: 0,
      totalCosts: 0,
      grossProfit: 0,
      totalPaymentsReceived: 0,
      totalPaymentsMade: 0,
      netCashFlow: 0,
    };

    for (const ps of projectSummaries) {
      totals.totalRevenue += ps.totalRevenue;
      totals.totalCosts += ps.totalCosts;
      totals.grossProfit += ps.grossProfit;
      totals.totalPaymentsReceived += ps.totalPaymentsReceived;
      totals.totalPaymentsMade += ps.totalPaymentsMade;
      totals.netCashFlow += ps.netCashFlow;
    }

    return {
      projectSummaries,
      totals,
      currency: 'EGP',
    };
  }

  private async getProjectAccounting(projectId: string, projectName: string): Promise<ProjectAccounting> {
    const [clientStatementsResult, subcontractorStatementsResult, purchasesResult, paymentsReceivedResult, paymentsMadeResult] =
      await Promise.all([
        this.prisma.clientStatement.aggregate({
          _sum: { netPayable: true },
          where: { projectId, deletedAt: null },
        }),
        this.prisma.subcontractorStatement.aggregate({
          _sum: { netPayable: true },
          where: { projectId, deletedAt: null },
        }),
        this.prisma.purchase.aggregate({
          _sum: { total: true },
          where: { projectId, deletedAt: null },
        }),
        this.prisma.fundTransaction.aggregate({
          _sum: { amount: true },
          where: {
            fund: { projectId },
            type: 'add',
            deletedAt: null,
          },
        }),
        this.prisma.fundTransaction.aggregate({
          _sum: { amount: true },
          where: {
            fund: { projectId },
            type: { in: ['deduct', 'request'] },
            deletedAt: null,
          },
        }),
      ]);

    const totalRevenue = Number(clientStatementsResult._sum.netPayable ?? 0);
    const subcontractorCosts = Number(subcontractorStatementsResult._sum.netPayable ?? 0);
    const purchaseCosts = Number(purchasesResult._sum.total ?? 0);
    const totalCosts = subcontractorCosts + purchaseCosts;
    const totalPaymentsReceived = Number(paymentsReceivedResult._sum.amount ?? 0);
    const totalPaymentsMade = Number(paymentsMadeResult._sum.amount ?? 0);

    return {
      projectId,
      projectName,
      totalRevenue,
      totalCosts,
      grossProfit: totalRevenue - totalCosts,
      totalPaymentsReceived,
      totalPaymentsMade,
      netCashFlow: totalPaymentsReceived - totalPaymentsMade,
    };
  }
}
