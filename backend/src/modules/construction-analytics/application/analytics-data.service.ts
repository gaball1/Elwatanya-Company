import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  AnalyticsDataset,
  AttendanceRow,
  ComponentRow,
  ContractorBoqItemRow,
  ContractorBoqRow,
  EmployerBoqItemRow,
  FinalBoqItemRow,
  FundTransactionRow,
  MiscExpenseRow,
  PaymentRow,
  PurchaseRow,
  StatementItemRow,
  StatementRow,
} from '../domain/analytics.types';

const NUM = (v: any): number => (typeof v === 'number' ? v : Number(v ?? 0));
const STR = (v: any): string => (v === null || v === undefined ? '' : String(v));

/**
 * Efficient data aggregation layer. Loads the full analytics dataset for a
 * project (or the whole company for cross-project metrics) in a bounded number
 * of single-pass queries. All money/quantity Decimal values are normalized to
 * numbers here so downstream calculation functions stay pure and unit-testable.
 */
@Injectable()
export class AnalyticsDataService {
  private readonly logger = new Logger(AnalyticsDataService.name);

  constructor(private readonly prisma: PrismaService) {}

  async loadProjectDataset(projectId: string): Promise<AnalyticsDataset> {
    const [
      project,
      buildings,
      employerItems,
      analyticalItems,
      finalBoqs,
      contractorBoqs,
      subcontractors,
      employees,
      departments,
      clientStatements,
      subcontractorStatements,
      purchases,
      miscellaneous,
      fund,
      pendingApprovals,
    ] = await Promise.all([
      this.prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, name: true, code: true, status: true, startDate: true, progress: true, client: true, plannedDurationMonths: true },
      }),
      this.prisma.building.findMany({
        where: { projectId, deletedAt: null },
        select: { id: true, name: true, code: true, status: true, startDate: true },
      }),
      this.prisma.employerBoqItem.findMany({
        where: { building: { projectId } },
        select: { buildingId: true, itemCode: true, description: true, unit: true, quantity: true, unitPrice: true, totalValue: true },
      }),
      this.prisma.analyticalBoqItem.findMany({
        where: { building: { projectId } },
        select: { buildingId: true, itemCode: true, description: true, unit: true, quantity: true, unitPrice: true, totalValue: true },
      }),
      this.prisma.finalBoq.findMany({
        where: { projectId, deletedAt: null },
        select: { id: true },
      }),
      this.prisma.contractorBoq.findMany({
        where: { building: { projectId } },
        select: { id: true, buildingId: true, subcontractorId: true, workType: true, status: true, createdAt: true },
      }),
      this.prisma.subcontractor.findMany({
        where: { status: 'active' },
        select: { id: true, name: true, workType: true, marginType: true, marginValue: true, status: true },
      }),
      this.prisma.employee.findMany({
        where: { deletedAt: null, status: 'active' },
        select: { id: true, fullName: true, salary: true, status: true, departmentId: true },
      }),
      this.prisma.department.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true },
      }),
      this.prisma.clientStatement.findMany({
        where: { projectId },
        select: { id: true, projectId: true, buildingId: true, buildingName: true, clientId: true, date: true, status: true, totalWorkValue: true, totalDeductions: true, netPayable: true },
      }),
      this.prisma.subcontractorStatement.findMany({
        where: { projectId },
        select: { id: true, projectId: true, buildingId: true, buildingName: true, subcontractorId: true, subcontractorName: true, date: true, status: true, totalWorkValue: true, totalDeductions: true, previousPaid: true, netPayable: true },
      }),
      this.prisma.purchase.findMany({
        where: { projectId, deletedAt: null },
        select: { id: true, projectId: true, buildingId: true, supplierId: true, supplierName: true, itemName: true, quantity: true, unitPrice: true, total: true, status: true, date: true },
      }),
      this.prisma.miscellaneous.findMany({
        where: { projectId },
        select: { id: true, projectId: true, description: true, amount: true, category: true, date: true },
      }),
      this.prisma.projectFund.findUnique({
        where: { projectId },
        select: { id: true, projectId: true, initialBalance: true, currentBalance: true },
      }),
      this.prisma.approval.count({ where: { status: 'pending' } }),
    ]);

    const buildingIds = buildings.map((b) => b.id);
    const finalBoqIds = finalBoqs.map((b) => b.id);
    const contractorBoqIds = contractorBoqs.map((b) => b.id);

    const [
      finalBoqItems,
      contractorBoqItems,
      statements,
      payments,
      fundTransactions,
      attendance,
    ] = await Promise.all([
      this.prisma.finalBoqItem.findMany({
        where: { finalBoqId: { in: finalBoqIds }, deletedAt: null },
        select: { id: true, finalBoqId: true, businessCode: true, description: true, unit: true, quantity: true, unitPrice: true, totalValue: true, itemStatus: true, parentItemId: true },
      }),
      this.prisma.contractorBoqItem.findMany({
        where: { contractorBoqId: { in: contractorBoqIds }, deletedAt: null },
        select: { id: true, contractorBoqId: true, itemCode: true, description: true, unit: true, quantity: true, assignedQuantity: true, unitPrice: true, totalValue: true, finalItemId: true, componentId: true },
      }),
      this.prisma.statement.findMany({
        where: { contractorBoqId: { in: contractorBoqIds } },
        select: { id: true, contractorBoqId: true, status: true, sequenceNumber: true, runningNumber: true, netPayable: true, totalWorkValue: true, previousPaid: true, extractDate: true, label: true },
      }),
      this.prisma.payment.findMany({
        where: { buildingId: { in: buildingIds }, deletedAt: null },
        select: { id: true, buildingId: true, contractorId: true, statementId: true, amount: true, paidAt: true },
      }),
      this.prisma.fundTransaction.findMany({
        where: { fund: { projectId }, status: { in: ['approved', 'pending'] } },
        select: { id: true, fundId: true, type: true, category: true, amount: true, status: true, date: true, description: true },
      }),
      this.prisma.attendance.findMany({
        where: { projectId },
        select: { id: true, employeeId: true, date: true, workedMinutes: true, hoursWorked: true, attendanceStatus: true, status: true, buildingId: true },
      }),
    ]);

    const componentItems = finalBoqItems.length > 0
      ? await this.prisma.component.findMany({
          where: { finalBoqItemId: { in: finalBoqItems.map((i) => i.id) } },
          select: { id: true, finalBoqItemId: true, businessCode: true, description: true, unit: true, quantity: true, unitPrice: true, totalValue: true },
        })
      : [];

    const statementIds = statements.map((s) => s.id);
    const rawStatementItems = statementIds.length
      ? await this.prisma.statementItem.findMany({
          where: { statementId: { in: statementIds } },
          select: { statementId: true, contractorBoqItemId: true, itemCode: true, totalExecuted: true, executionPercent: true, currentWorkValue: true, unitPrice: true },
        })
      : [];
    const statementItems: StatementItemRow[] = rawStatementItems.map((i) => ({
      statementId: i.statementId,
      contractorBoqItemId: i.contractorBoqItemId,
      itemCode: STR(i.itemCode),
      totalExecuted: NUM(i.totalExecuted),
      executionPercent: NUM(i.executionPercent),
      currentWorkValue: NUM(i.currentWorkValue),
      unitPrice: NUM(i.unitPrice),
    }));

    const inventoryItems = await this.prisma.inventoryItem.findMany({
      where: { deletedAt: null },
      select: { id: true, code: true, name: true, quantity: true, minQuantity: true, price: true, categoryId: true, warehouseId: true },
    });

    const stockMovements = await this.prisma.stockMovement.findMany({
      where: { itemId: { in: inventoryItems.map((i) => i.id) } },
      select: { id: true, itemId: true, type: true, quantity: true, date: true },
    });

    return {
      project: project
        ? { id: project.id, name: project.name, code: project.code, status: project.status, startDate: project.startDate, plannedDurationMonths: NUM(project.plannedDurationMonths) || 24, progress: NUM(project.progress), client: project.client }
        : null,
      buildings: buildings.map((b) => ({ id: b.id, name: b.name, code: b.code, status: b.status, startDate: b.startDate })),
      employerItems: employerItems.map((i): EmployerBoqItemRow => ({ buildingId: i.buildingId, itemCode: STR(i.itemCode), description: STR(i.description), unit: STR(i.unit), quantity: NUM(i.quantity), unitPrice: NUM(i.unitPrice), totalValue: NUM(i.totalValue) })),
      analyticalItems: analyticalItems.map((i) => ({ buildingId: i.buildingId, itemCode: STR(i.itemCode), description: STR(i.description), unit: STR(i.unit), quantity: NUM(i.quantity), unitPrice: NUM(i.unitPrice), totalValue: NUM(i.totalValue) })),
      finalBoqItems: finalBoqItems.map((i): FinalBoqItemRow => ({ id: i.id, finalBoqId: i.finalBoqId, businessCode: STR(i.businessCode), description: STR(i.description), unit: STR(i.unit), quantity: NUM(i.quantity), unitPrice: NUM(i.unitPrice), totalValue: NUM(i.totalValue), itemStatus: STR(i.itemStatus), parentItemId: i.parentItemId })),
      components: componentItems.map((c): ComponentRow => ({ id: c.id, finalBoqItemId: c.finalBoqItemId, businessCode: STR(c.businessCode), description: STR(c.description), unit: STR(c.unit), quantity: NUM(c.quantity), unitPrice: NUM(c.unitPrice), totalValue: NUM(c.totalValue) })),
      contractorBoqs: contractorBoqs.map((b): ContractorBoqRow => ({ id: b.id, buildingId: b.buildingId, subcontractorId: b.subcontractorId, workType: b.workType, status: STR(b.status), createdAt: b.createdAt })),
      contractorBoqItems: contractorBoqItems.map((i): ContractorBoqItemRow => ({ id: i.id, contractorBoqId: i.contractorBoqId, itemCode: STR(i.itemCode), description: STR(i.description), unit: STR(i.unit), quantity: NUM(i.quantity), assignedQuantity: NUM(i.assignedQuantity), unitPrice: NUM(i.unitPrice), totalValue: NUM(i.totalValue), finalItemId: i.finalItemId, componentId: i.componentId })),
      statements: statements.map((s): StatementRow => ({ id: s.id, contractorBoqId: s.contractorBoqId, status: STR(s.status), sequenceNumber: NUM(s.sequenceNumber), runningNumber: s.runningNumber === null ? null : NUM(s.runningNumber), netPayable: NUM(s.netPayable), totalWorkValue: NUM(s.totalWorkValue), previousPaid: NUM(s.previousPaid), extractDate: s.extractDate, label: s.label })),
      statementItems: statementItems.map((i): StatementItemRow => ({ statementId: i.statementId, contractorBoqItemId: i.contractorBoqItemId, itemCode: STR(i.itemCode), totalExecuted: NUM(i.totalExecuted), executionPercent: NUM(i.executionPercent), currentWorkValue: NUM(i.currentWorkValue), unitPrice: NUM(i.unitPrice) })),
      payments: payments.map((p): PaymentRow => ({ id: p.id, buildingId: p.buildingId, contractorId: p.contractorId, statementId: p.statementId, amount: NUM(p.amount), paidAt: p.paidAt })),
      purchases: purchases.map((p): PurchaseRow => ({ id: p.id, projectId: p.projectId, buildingId: p.buildingId, supplierId: p.supplierId, supplierName: p.supplierName, itemName: STR(p.itemName), quantity: NUM(p.quantity), unitPrice: NUM(p.unitPrice), total: NUM(p.total), status: STR(p.status), date: p.date })),
      fund: fund ? { id: fund.id, projectId: fund.projectId, initialBalance: NUM(fund.initialBalance), currentBalance: NUM(fund.currentBalance) } : null,
      fundTransactions: fundTransactions.map((t): FundTransactionRow => ({ id: t.id, fundId: t.fundId, type: STR(t.type), category: STR(t.category), amount: NUM(t.amount), status: STR(t.status), date: t.date, description: STR(t.description) })),
      miscellaneous: miscellaneous.map((m): MiscExpenseRow => ({ id: m.id, projectId: m.projectId, description: STR(m.description), amount: NUM(m.amount), category: STR(m.category), date: m.date })),
      inventoryItems: inventoryItems.map((i) => ({ id: i.id, code: STR(i.code), name: STR(i.name), quantity: NUM(i.quantity), minQuantity: NUM(i.minQuantity), price: NUM(i.price), categoryId: i.categoryId, warehouseId: i.warehouseId })),
      stockMovements: stockMovements.map((s) => ({ id: s.id, itemId: s.itemId, type: STR(s.type), quantity: NUM(s.quantity), date: s.date })),
      attendance: attendance.map((a): AttendanceRow => ({ id: a.id, employeeId: a.employeeId, date: a.date, workedMinutes: a.workedMinutes === null ? null : NUM(a.workedMinutes), hoursWorked: NUM(a.hoursWorked), attendanceStatus: STR(a.attendanceStatus), status: STR(a.status), buildingId: a.buildingId })),
      employees: employees.map((e) => ({ id: e.id, fullName: e.fullName, salary: NUM(e.salary), status: e.status, departmentId: e.departmentId })),
      departments: departments.map((d) => ({ id: d.id, name: d.name })),
      subcontractors: subcontractors.map((s) => ({ id: s.id, name: s.name, workType: s.workType, marginType: s.marginType, marginValue: NUM(s.marginValue), status: s.status })),
      clientStatements: clientStatements.map((c) => ({ id: c.id, projectId: c.projectId, buildingId: c.buildingId, buildingName: c.buildingName, clientId: c.clientId, date: c.date, status: STR(c.status), totalWorkValue: NUM(c.totalWorkValue), totalDeductions: NUM(c.totalDeductions), netPayable: NUM(c.netPayable) })),
      subcontractorStatements: subcontractorStatements.map((s) => ({ id: s.id, projectId: s.projectId, buildingId: s.buildingId, buildingName: s.buildingName, subcontractorId: s.subcontractorId, subcontractorName: s.subcontractorName, date: s.date, status: STR(s.status), totalWorkValue: NUM(s.totalWorkValue), totalDeductions: NUM(s.totalDeductions), previousPaid: NUM(s.previousPaid), netPayable: NUM(s.netPayable) })),
      pendingApprovals: pendingApprovals,
    };
  }

  async loadCompanyDataset(): Promise<{
    projects: { id: string; name: string; code: string; status: string; startDate: Date | null; progress: number }[];
    projectCount: number;
    buildingCount: number;
    employeeCount: number;
    employerBoqTotal: number;
    contractorBoqTotal: number;
    extractValue: number;
    paymentsTotal: number;
    purchasesTotal: number;
    miscTotal: number;
    inventoryValue: number;
    cashBalance: number;
    pendingApprovals: number;
    attendanceToday: number;
    lateToday: number;
    absentCount: number;
    presentCount: number;
    attendanceRate: number;
    activeWorkforce: number;
  }> {
    const [
      projects,
      buildingCount,
      employeeCount,
      employerAgg,
      contractorAgg,
      statementAgg,
      paymentAgg,
      purchaseAgg,
      miscAgg,
      inventoryItems,
      fundAgg,
      pendingApprovals,
      attendanceToday,
      lateToday,
      allAttendance,
    ] = await Promise.all([
      this.prisma.project.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, code: true, status: true, startDate: true, progress: true },
      }),
      this.prisma.building.count({ where: { deletedAt: null } }),
      this.prisma.employee.count({ where: { deletedAt: null } }),
      this.prisma.employerBoqItem.aggregate({ _sum: { totalValue: true } }),
      this.prisma.contractorBoqItem.aggregate({ _sum: { totalValue: true } }),
      this.prisma.statement.aggregate({ _sum: { netPayable: true } }),
      this.prisma.payment.aggregate({ _sum: { amount: true } }),
      this.prisma.purchase.aggregate({ _sum: { total: true } }),
      this.prisma.miscellaneous.aggregate({ _sum: { amount: true } }),
      this.prisma.inventoryItem.findMany({
        where: { deletedAt: null },
        select: { quantity: true, price: true },
      }),
      this.prisma.projectFund.aggregate({ _sum: { currentBalance: true } }),
      this.prisma.approval.count({ where: { status: 'pending' } }),
      this.prisma.attendance.count({
        where: {
          date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          attendanceStatus: { in: ['checkedIn', 'checkedOut', 'late', 'pending'] },
        },
      }),
      this.prisma.attendance.count({
        where: {
          date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          attendanceStatus: 'late',
        },
      }),
      this.prisma.attendance.findMany({
        where: { deletedAt: null },
        select: { employeeId: true, attendanceStatus: true, status: true },
      }),
    ]);

    const isPresent = (a: { attendanceStatus: string; status: string }) =>
      ['present', 'checkedin', 'checkedout', 'late', 'pending'].includes(a.attendanceStatus.toLowerCase());
    const isAbsent = (a: { attendanceStatus: string; status: string }) =>
      a.attendanceStatus.toLowerCase() === 'absent' || a.status.toLowerCase() === 'absent';
    const presentCount = allAttendance.filter(isPresent).length;
    const absentCount = allAttendance.filter(isAbsent).length;
    const attendanceRate = allAttendance.length > 0 ? (presentCount / allAttendance.length) * 100 : 0;
    const activeWorkforce = new Set(allAttendance.filter(isPresent).map((a) => a.employeeId)).size;

    return {
      projects: projects.map((p) => ({ id: p.id, name: p.name, code: p.code, status: p.status, startDate: p.startDate, progress: NUM(p.progress) })),
      projectCount: projects.length,
      buildingCount,
      employeeCount,
      employerBoqTotal: NUM(employerAgg._sum?.totalValue),
      contractorBoqTotal: NUM(contractorAgg._sum?.totalValue),
      extractValue: NUM(statementAgg._sum?.netPayable),
      paymentsTotal: NUM(paymentAgg._sum?.amount),
      purchasesTotal: NUM(purchaseAgg._sum?.total),
      miscTotal: NUM(miscAgg._sum?.amount),
      inventoryValue: inventoryItems.reduce((acc, i) => acc + NUM(i.quantity) * NUM(i.price), 0),
      cashBalance: NUM(fundAgg._sum?.currentBalance),
      pendingApprovals,
      attendanceToday,
      lateToday,
      absentCount,
      presentCount,
      attendanceRate,
      activeWorkforce,
    };
  }

  async listProjects(): Promise<{ id: string; name: string; code: string; status: string }[]> {
    const projects = await this.prisma.project.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, code: true, status: true },
      orderBy: { createdAt: 'asc' },
    });
    return projects.map((p) => ({ id: p.id, name: p.name, code: p.code, status: p.status }));
  }
}
