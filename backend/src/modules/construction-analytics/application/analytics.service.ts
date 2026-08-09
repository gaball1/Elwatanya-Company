import { Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsDataService } from './analytics-data.service';
import { AnalyticsCacheService } from '../infrastructure/analytics-cache.service';
import { AnalyticsDataset } from '../domain/analytics.types';
import {
  computeBoqBreakdown,
  computeBoqIntelligence,
  computeDrillDown,
  computeEarnedValue,
  computeProgress,
  round2,
} from './analytics-math';
import {
  computeBuildingDashboards,
  computeContractorIntelligence,
  computeEmployeeIntelligence,
  computeInventoryIntelligence,
  computePurchaseIntelligence,
  computeTreasuryIntelligence,
} from './analytics-intelligence';
import { computeRisks } from './analytics-risks';
import { computeAttendanceIntelligence, computeAttendanceDrillDown, isAttendanceDrilldownKpi } from './attendance-intelligence';

const CACHE_TTL_MS = 60_000;

export interface DashboardResponse {
  project: {
    id: string;
    name: string;
    code: string;
    status: string;
    startDate: Date | null;
    progress: number;
    client: string | null;
  } | null;
  kpis: ReturnType<typeof buildKpis>;
  evm: ComputedAnalytics['evm'];
  progress: ComputedAnalytics['progress'];
  cost: ComputedAnalytics['cost']['totals'];
  boq: ComputedAnalytics['boq'];
  contractors: ComputedAnalytics['contractors'];
  purchases: ComputedAnalytics['purchases'];
  treasury: ComputedAnalytics['treasury'];
  inventory: ComputedAnalytics['inventory'];
  employees: ComputedAnalytics['employees'];
  attendance: ComputedAnalytics['attendance'];
  buildings: ComputedAnalytics['buildings'];
  risks: ComputedAnalytics['risks'];
}

interface ComputedAnalytics {
  evm: ReturnType<typeof computeEarnedValue>;
  progress: ReturnType<typeof computeProgress>;
  cost: ReturnType<typeof computeBoqBreakdown>;
  boq: ReturnType<typeof computeBoqIntelligence>;
  contractors: ReturnType<typeof computeContractorIntelligence>;
  purchases: ReturnType<typeof computePurchaseIntelligence>;
  treasury: ReturnType<typeof computeTreasuryIntelligence>;
  inventory: ReturnType<typeof computeInventoryIntelligence>;
  employees: ReturnType<typeof computeEmployeeIntelligence>;
  attendance: ReturnType<typeof computeAttendanceIntelligence>;
  buildings: ReturnType<typeof computeBuildingDashboards>;
  risks: ReturnType<typeof computeRisks>;
}

function computeAll(ds: AnalyticsDataset): ComputedAnalytics {
  const cost = computeBoqBreakdown(ds);
  return {
    evm: computeEarnedValue(ds),
    progress: computeProgress(ds),
    cost,
    boq: computeBoqIntelligence(ds),
    contractors: computeContractorIntelligence(ds),
    purchases: computePurchaseIntelligence(ds),
    treasury: computeTreasuryIntelligence(ds),
    inventory: computeInventoryIntelligence(ds),
    employees: computeEmployeeIntelligence(ds),
    attendance: computeAttendanceIntelligence(ds),
    buildings: computeBuildingDashboards(ds),
    risks: computeRisks(ds),
  };
}

function buildKpis(ds: AnalyticsDataset, c: ComputedAnalytics) {
  const { evm, progress, cost, treasury, purchases: purchase, inventory, employees, attendance, contractors, risks } = c;

  const statusFor = (value: number, good: number, warning: number): 'good' | 'warning' | 'critical' =>
    value >= good ? 'good' : value >= warning ? 'warning' : 'critical';

  const d = (en: string, ar: string) => ({ description: en, descriptionAr: ar });

  return {
    ev: { key: 'ev', label: 'Earned Value', labelAr: 'القيمة المكتسبة', value: evm.ev, unit: 'currency', status: 'good', ...d('Value of approved work performed to date', 'قيمة الأعمال المعتمدة المنفذة حتى الآن') },
    pv: { key: 'pv', label: 'Planned Value', labelAr: 'القيمة المخططة', value: evm.pv, unit: 'currency', status: 'good', ...d('Budgeted cost of work planned by schedule', 'التكلفة المخطط لها حسب الجدول الزمني') },
    ac: { key: 'ac', label: 'Actual Cost', labelAr: 'التكلفة الفعلية', value: evm.ac, unit: 'currency', status: 'good', ...d('Total actual money spent to date', 'إجمالي الأموال المصروفة فعلياً حتى الآن') },
    cpi: { key: 'cpi', label: 'Cost Performance Index', labelAr: 'مؤشر أداء التكلفة', value: evm.cpi, unit: 'ratio', status: statusFor(evm.cpi, 1, 0.8), ...d('Earned value divided by actual cost. Above 1 is good.', 'القيمة المكتسبة مقسومة على التكلفة الفعلية. أعلى من 1 يعني أداء جيد.') },
    spi: { key: 'spi', label: 'Schedule Performance Index', labelAr: 'مؤشر أداء الجدول', value: evm.spi, unit: 'ratio', status: statusFor(evm.spi, 1, 0.8), ...d('Earned value divided by planned value. Above 1 is ahead of schedule.', 'القيمة المكتسبة مقسومة على المخطط. أعلى من 1 يعني تقدماً عن الجدول.') },
    sv: { key: 'sv', label: 'Schedule Variance', labelAr: 'انحراف الجدول', value: evm.sv, unit: 'currency', status: evm.sv >= 0 ? 'good' : 'warning', ...d('Difference between earned and planned value', 'الفرق بين القيمة المكتسبة والقيمة المخططة') },
    cv: { key: 'cv', label: 'Cost Variance', labelAr: 'انحراف التكلفة', value: evm.cv, unit: 'currency', status: evm.cv >= 0 ? 'good' : 'warning', ...d('Difference between earned value and actual cost', 'الفرق بين القيمة المكتسبة والتكلفة الفعلية') },
    eac: { key: 'eac', label: 'Estimate at Completion', labelAr: 'التقدير عند الإنجاز', value: evm.eac, unit: 'currency', status: 'neutral', ...d('Forecast total cost when the project is finished', 'التكلفة المتوقعة عند الانتهاء من المشروع') },
    etc: { key: 'etc', label: 'Estimate to Complete', labelAr: 'المتبقي للإنجاز', value: evm.etc, unit: 'currency', status: 'neutral', ...d('Expected cost to finish remaining work', 'التكلفة المتوقعة لإنهاء الأعمال المتبقية') },
    vac: { key: 'vac', label: 'Variance at Completion', labelAr: 'الانحراف عند الإنجاز', value: evm.vac, unit: 'currency', status: evm.vac >= 0 ? 'good' : 'critical', ...d('Expected cost overrun or saving at project end', 'التجاوز أو التوفير المتوقع عند نهاية المشروع') },
    project_progress: { key: 'project_progress', label: 'Project Progress', labelAr: 'نسبة إنجاز المشروع', value: progress.projectPercent, unit: 'percent', status: statusFor(progress.projectPercent, 70, 40), ...d('Overall physical completion percentage', 'نسبة الإنجاز الكلية للمشروع') },
    planned_percent: { key: 'planned_percent', label: 'Planned Completion', labelAr: 'نسبة الإنجاز المخطط', value: evm.plannedPercent, unit: 'percent', status: 'neutral', ...d('Planned completion percentage by schedule', 'نسبة الإنجاز المخطط لها حسب الجدول') },
    boq_profit: { key: 'boq_profit', label: 'BOQ Profit', labelAr: 'ربح بنود الكميات', value: cost.totals.profit, unit: 'currency', status: cost.totals.profit >= 0 ? 'good' : 'critical', ...d('Employer value minus contractor value', 'قيمة صاحب العمل مطروحاً منها قيمة المقاولين') },
    boq_margin: { key: 'boq_margin', label: 'BOQ Margin', labelAr: 'هامش ربح بنود الكميات', value: cost.totals.margin, unit: 'percent', status: statusFor(cost.totals.margin, 15, 5), ...d('Profit margin on bill of quantities', 'هامش الربح على بنود الكميات') },
    cash_flow: { key: 'cash_flow', label: 'Net Cash Flow', labelAr: 'التدفق النقدي', value: treasury.netCashFlow, unit: 'currency', status: treasury.netCashFlow >= 0 ? 'good' : 'critical', ...d('Cash in minus cash out', 'المدخلات النقدية مطروحاً منها المخرجات') },
    cash_balance: { key: 'cash_balance', label: 'Cash Balance', labelAr: 'الرصيد النقدي', value: treasury.balance, unit: 'currency', status: treasury.balance >= 0 ? 'good' : 'critical', ...d('Current treasury balance', 'الرصيد الحالي للخزنة') },
    burn_rate: { key: 'burn_rate', label: 'Burn Rate', labelAr: 'معدل الصرف', value: treasury.monthly.length > 0 ? treasury.cashOut / treasury.monthly.length : 0, unit: 'currency', status: 'warning', ...d('Average monthly cash outflow', 'متوسط الصرف الشهري') },
    purchase_budget: { key: 'purchase_budget', label: 'Purchase Budget', labelAr: 'ميزانية المشتريات', value: purchase.purchaseBudget, unit: 'currency', status: 'neutral', ...d('Allocated budget for purchases', 'الميزانية المخصصة للمشتريات') },
    purchase_cost: { key: 'purchase_cost', label: 'Actual Purchases', labelAr: 'المشتريات الفعلية', value: purchase.actualPurchases, unit: 'currency', status: purchase.costOverrun <= 0 ? 'good' : 'warning', ...d('Total value of actual purchases', 'إجمالي قيمة المشتريات الفعلية') },
    inventory_value: { key: 'inventory_value', label: 'Inventory Value', labelAr: 'قيمة المخزون', value: inventory.inventoryValue, unit: 'currency', status: 'neutral', ...d('Total value of current stock', 'القيمة الإجمالية للمخزون الحالي') },
    attendance_rate: { key: 'attendance_rate', label: 'Attendance Rate', labelAr: 'نسبة الحضور', value: employees.attendanceRate, unit: 'percent', status: statusFor(employees.attendanceRate, 90, 70), ...d('Percentage of employees present', 'نسبة الموظفين الحاضرين') },
    absence_rate: { key: 'absence_rate', label: 'Absence Rate', labelAr: 'نسبة الغياب', value: employees.absencePercent, unit: 'percent', status: statusFor(100 - employees.absencePercent, 90, 70), ...d('Percentage of employee absence', 'نسبة غياب الموظفين') },
    late_rate: { key: 'late_rate', label: 'Late Arrival Rate', labelAr: 'نسبة التأخير', value: employees.latePercent, unit: 'percent', status: statusFor(100 - employees.latePercent, 90, 70), ...d('Percentage of late arrivals', 'نسبة الحضور المتأخر') },
    avg_work_hours: { key: 'avg_work_hours', label: 'Average Working Hours', labelAr: 'متوسط ساعات العمل', value: attendance.averageWorkingHours, unit: 'hours', status: attendance.averageWorkingHours >= 8 ? 'good' : 'warning', ...d('Average hours worked per present employee', 'متوسط ساعات العمل لكل موظف حاضر') },
    overtime_hours: { key: 'overtime_hours', label: 'Overtime Hours', labelAr: 'ساعات العمل الإضافي', value: attendance.overtimeHours, unit: 'hours', status: 'neutral', ...d('Total overtime hours beyond the 8-hour standard', 'إجمالي ساعات العمل الإضافية فوق 8 ساعات') },
    active_workforce: { key: 'active_workforce', label: 'Active Workforce', labelAr: 'القوى العاملة النشطة', value: attendance.activeWorkforce, unit: 'count', status: 'neutral', ...d('Number of employees with attendance on the project', 'عدد الموظفين المسجل حضورهم في المشروع') },
    payroll_cost: { key: 'payroll_cost', label: 'Payroll Cost', labelAr: 'تكلفة الرواتب', value: employees.payrollCost, unit: 'currency', status: 'neutral', ...d('Total monthly payroll cost', 'إجمالي تكلفة الرواتب الشهرية') },
    contractor_count: { key: 'contractor_count', label: 'Active Contractors', labelAr: 'عدد المقاولين', value: contractors.length, unit: 'count', status: 'neutral', ...d('Number of active contractors on the project', 'عدد المقاولين النشطين في المشروع') },
    risk_score: { key: 'risk_score', label: 'Risk Score', labelAr: 'مؤشر المخاطر', value: risks.score.overall, unit: 'score', status: risks.score.level === 'low' ? 'good' : risks.score.level === 'medium' ? 'warning' : 'critical', ...d('Overall project risk score from 0 to 100', 'مؤشر المخاطر العام للمشروع من 0 إلى 100') },
    pending_approvals: { key: 'pending_approvals', label: 'Pending Approvals', labelAr: 'الموافقات المعلقة', value: ds.pendingApprovals, unit: 'count', status: ds.pendingApprovals > 10 ? 'warning' : 'good', ...d('Number of approval requests awaiting decision', 'عدد طلبات الموافقة التي تنتظر قراراً') },
  };
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly data: AnalyticsDataService,
    private readonly cache: AnalyticsCacheService,
  ) {}

  private async getDataset(projectId: string): Promise<AnalyticsDataset> {
    return this.cache.memoize(`analytics:dataset:${projectId}`, () => this.data.loadProjectDataset(projectId), CACHE_TTL_MS);
  }

  private async getComputed(projectId: string): Promise<ComputedAnalytics> {
    return this.cache.memoize(
      `analytics:computed:${projectId}`,
      async () => computeAll(await this.getDataset(projectId)),
      CACHE_TTL_MS,
    );
  }

  async listProjects(): Promise<{ id: string; name: string; code: string; status: string }[]> {
    return this.cache.memoize('analytics:projects', () => this.data.listProjects(), CACHE_TTL_MS);
  }

  async getDashboard(projectId: string): Promise<DashboardResponse> {
    const ds = await this.getDataset(projectId);
    if (!ds.project) throw new NotFoundException(`Project ${projectId} not found`);

    const c = await this.getComputed(projectId);
    return {
      project: ds.project,
      kpis: buildKpis(ds, c),
      evm: c.evm,
      progress: c.progress,
      cost: c.cost.totals,
      boq: c.boq,
      contractors: c.contractors,
      purchases: c.purchases,
      treasury: c.treasury,
      inventory: c.inventory,
      employees: c.employees,
      attendance: c.attendance,
      buildings: c.buildings,
      risks: c.risks,
    };
  }

  async getKpis(projectId: string) {
    const [ds, c] = await Promise.all([this.getDataset(projectId), this.getComputed(projectId)]);
    return buildKpis(ds, c);
  }

  async getEvm(projectId: string) {
    return (await this.getComputed(projectId)).evm;
  }

  async getProgress(projectId: string) {
    return (await this.getComputed(projectId)).progress;
  }

  async getCostBreakdown(projectId: string) {
    return (await this.getComputed(projectId)).cost;
  }

  async getBoqAnalysis(projectId: string) {
    return (await this.getComputed(projectId)).boq;
  }

  async getContractors(projectId: string) {
    return (await this.getComputed(projectId)).contractors;
  }

  async getPurchases(projectId: string) {
    return (await this.getComputed(projectId)).purchases;
  }

  async getTreasury(projectId: string) {
    return (await this.getComputed(projectId)).treasury;
  }

  async getInventory(projectId: string) {
    return (await this.getComputed(projectId)).inventory;
  }

  async getEmployees(projectId: string) {
    return (await this.getComputed(projectId)).employees;
  }

  async getAttendance(projectId: string) {
    return (await this.getComputed(projectId)).attendance;
  }

  async getBuildings(projectId: string) {
    return (await this.getComputed(projectId)).buildings;
  }

  async getRisks(projectId: string) {
    return (await this.getComputed(projectId)).risks;
  }

  async getDrillDown(projectId: string, kpi: string) {
    const ds = await this.getDataset(projectId);
    if (isAttendanceDrilldownKpi(kpi)) {
      const node = computeAttendanceDrillDown(ds, kpi);
      if (!node) throw new NotFoundException(`No drill-down available for KPI "${kpi}"`);
      return node;
    }
    const allowed = ['progress', 'cost', 'revenue', 'profit'] as const;
    if (!allowed.includes(kpi as (typeof allowed)[number])) {
      throw new NotFoundException(`No drill-down available for KPI "${kpi}"`);
    }
    const node = computeDrillDown({ ds, kpi: kpi as (typeof allowed)[number] });
    if (!node) throw new NotFoundException(`No drill-down available for KPI "${kpi}"`);
    return node;
  }

  async getExecutive() {
    const company = await this.data.loadCompanyDataset();
    const projects = await this.data.listProjects();
    const dashboards = await Promise.all(
      projects.map((p) => this.getDashboard(p.id).catch(() => null)),
    );
    const active = dashboards.filter((d) => d !== null) as DashboardResponse[];

    const totalRevenue = active.reduce((acc, d) => acc + d.cost.employerValue, 0);
    const totalProfit = active.reduce((acc, d) => acc + d.cost.profit, 0);
    const totalCost = totalRevenue - totalProfit;
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const avgRisk = active.length > 0 ? active.reduce((acc, d) => acc + d.risks.score.overall, 0) / active.length : 0;
    const avgProgress = active.length > 0 ? active.reduce((acc, d) => acc + d.progress.projectPercent, 0) / active.length : 0;

    return {
      company: {
        projectCount: company.projectCount,
        buildingCount: company.buildingCount,
        employeeCount: company.employeeCount,
        pendingApprovals: company.pendingApprovals,
        attendanceToday: company.attendanceToday,
        lateToday: company.lateToday,
        absentCount: company.absentCount,
        presentCount: company.presentCount,
        attendanceRate: round2(company.attendanceRate),
        activeWorkforce: company.activeWorkforce,
      },
      totals: {
        revenue: totalRevenue,
        cost: totalCost,
        profit: totalProfit,
        margin: avgMargin,
        cashBalance: company.cashBalance,
        inventoryValue: company.inventoryValue,
      },
      averages: {
        progress: avgProgress,
        riskScore: avgRisk,
      },
      projects: active.map((d) => ({
        id: d.project!.id,
        name: d.project!.name,
        code: d.project!.code,
        status: d.project!.status,
        progress: d.progress.projectPercent,
        revenue: d.cost.employerValue,
        cost: round2(d.cost.employerValue - d.cost.profit),
        profit: d.cost.profit,
        margin: d.cost.margin,
        riskScore: d.risks.score.overall,
        health: 'neutral' as const,
      })),
    };
  }

  async getSummary(projectId: string) {
    const ds = await this.getDataset(projectId);
    const dashboard = await this.getDashboard(projectId);
    const topRisk = dashboard.risks.items.slice(0, 3).map((r) => r.label);
    const topProfit = dashboard.boq.topProfit.slice(0, 3).map((i) => `${i.itemCode} ${i.description}`);
    const topLoss = dashboard.boq.topLoss.slice(0, 3).map((i) => `${i.itemCode} ${i.description}`);
    const delayedContractors = dashboard.contractors
      .filter((c) => c.averageDelayDays > 0)
      .sort((a, b) => b.averageDelayDays - a.averageDelayDays)
      .slice(0, 3)
      .map((c) => c.name);

    return {
      project: ds.project,
      generatedAt: new Date().toISOString(),
      performance: {
        progress: dashboard.progress.projectPercent,
        spi: dashboard.evm.spi,
        cpi: dashboard.evm.cpi,
        verdict: dashboard.evm.spi >= 1 && dashboard.evm.cpi >= 1 ? 'on_track' : dashboard.evm.spi < 1 && dashboard.evm.cpi < 1 ? 'at_risk' : 'watch',
      },
      financials: {
        revenue: dashboard.cost.employerValue,
        cost: round2(dashboard.cost.employerValue - dashboard.cost.profit),
        profit: dashboard.cost.profit,
        margin: dashboard.cost.margin,
      },
      topProfitableItems: topProfit,
      topLossMakingItems: topLoss,
      delayedContractors,
      topRisks: topRisk,
      actions: [
        ...(dashboard.evm.spi < 1 ? ['Rebaseline schedule and expedite critical path work.'] : []),
        ...(dashboard.evm.cpi < 1 ? ['Review subcontractor rates and negotiate better terms.'] : []),
        ...(dashboard.risks.score.level !== 'low' ? ['Mitigate the top-rated risks before they materialize.'] : []),
        ...(dashboard.inventory.reorderItems.length > 0 ? [`Replenish ${dashboard.inventory.reorderItems.length} inventory items below reorder point.`] : []),
        ...(dashboard.treasury.committedPayments > dashboard.treasury.balance ? ['Align payment schedule with available cash balance.'] : []),
      ],
    };
  }
}
