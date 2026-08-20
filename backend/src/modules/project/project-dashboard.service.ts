import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class ProjectDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getProjectDashboard(projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const now = new Date();

    const [
      buildingCount,
      employeeCount,
      extractCount,
      clientStatementAgg,
      pendingStatements,
      subcontractorStatementAgg,
      purchaseAgg,
      recentPurchaseCount,
      fundTransactions,
      pendingClientStatementIds,
      pendingSubcontractorStatementIds,
    ] = await Promise.all([
      this.prisma.building.count({
        where: { projectId, deletedAt: null },
      }),
      this.prisma.userProjectAssignment.count({
        where: { projectId },
      }),
      this.prisma.statement.count({
        where: {
          deletedAt: null,
          contractorBoq: { building: { projectId, deletedAt: null } },
        },
      }),
      this.prisma.clientStatement.aggregate({
        where: { projectId, deletedAt: null },
        _sum: { netPayable: true },
      }),
      this.prisma.clientStatement.count({
        where: { projectId, deletedAt: null, status: 'pending' },
      }),
      this.prisma.subcontractorStatement.aggregate({
        where: { projectId, deletedAt: null },
        _sum: { netPayable: true },
      }),
      this.prisma.purchase.aggregate({
        where: { projectId, deletedAt: null },
        _sum: { total: true },
      }),
      this.prisma.purchase.count({
        where: {
          projectId,
          deletedAt: null,
          createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.fundTransaction.findMany({
        where: { fund: { projectId }, deletedAt: null },
        select: { type: true, amount: true },
      }),
      this.prisma.clientStatement.findMany({
        where: { projectId, deletedAt: null, status: 'pending' },
        select: { id: true },
      }),
      this.prisma.subcontractorStatement.findMany({
        where: { projectId, deletedAt: null, status: 'pending' },
        select: { id: true },
      }),
    ]);

    const totalRevenue = Number(clientStatementAgg._sum.netPayable ?? 0);
    const subcontractorCosts = Number(subcontractorStatementAgg._sum.netPayable ?? 0);
    const purchaseCosts = Number(purchaseAgg._sum.total ?? 0);
    const totalCosts = subcontractorCosts + purchaseCosts;
    const grossProfit = totalRevenue - totalCosts;

    let paymentsReceived = 0;
    let paymentsMade = 0;
    for (const tx of fundTransactions) {
      const amount = Number(tx.amount);
      if (tx.type === 'add') {
        paymentsReceived += amount;
      } else if (tx.type === 'deduct' || tx.type === 'request') {
        paymentsMade += amount;
      }
    }
    const netCashFlow = paymentsReceived - paymentsMade;

    const pendingClientIds = pendingClientStatementIds.map((cs) => cs.id);
    const pendingSubIds = pendingSubcontractorStatementIds.map((ss) => ss.id);

    let pendingApprovals = 0;
    if (pendingClientIds.length > 0 || pendingSubIds.length > 0) {
      pendingApprovals = await this.prisma.approval.count({
        where: {
          status: 'pending',
          OR: [
            ...(pendingClientIds.length > 0
              ? [{ entityType: 'client-statement', entityId: { in: pendingClientIds } }]
              : []),
            ...(pendingSubIds.length > 0
              ? [{ entityType: 'subcontractor-statement', entityId: { in: pendingSubIds } }]
              : []),
          ],
        },
      });
    }

    const alerts: { type: string; message: string; severity: string }[] = [];

    if (netCashFlow < 0) {
      alerts.push({
        type: 'financial',
        message: 'Negative cash flow',
        severity: 'critical',
      });
    }

    if (pendingStatements > 0) {
      alerts.push({
        type: 'approval',
        message: 'Pending statements need review',
        severity: 'warning',
      });
    }

    if (project.startDate) {
      const ageMonths =
        (now.getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (project.progress < 30 && ageMonths > 6) {
        alerts.push({
          type: 'schedule',
          message: 'Project may be behind schedule',
          severity: 'warning',
        });
      }
    }

    return {
      project: {
        id: project.id,
        name: project.name,
        progress: project.progress,
        status: project.status,
        startDate: project.startDate?.toISOString() ?? null,
        plannedDurationMonths: project.plannedDurationMonths,
      },
      financials: {
        totalRevenue,
        totalCosts,
        grossProfit,
        paymentsReceived,
        paymentsMade,
        netCashFlow,
      },
      stats: {
        buildingCount,
        employeeCount,
        extractCount,
        pendingApprovals,
        pendingStatements,
        recentPurchases: recentPurchaseCount,
      },
      alerts,
    };
  }
}
