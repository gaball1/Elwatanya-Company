import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { KpiDefinition, KpiResult } from '../domain/kpi-definition.entity';

@Injectable()
export class ConstructionBiService {
  private readonly logger = new Logger(ConstructionBiService.name);
  private kpis: KpiDefinition[] = [];

  constructor(private readonly prisma: PrismaService) {
    this.registerKpis();
  }

  private registerKpis(): void {
    const kpiList = [
      this.createKpi('ev', 'Earned Value (EV)', 'القيمة المكتسبة', 'earned_value', 'currency', true, async (p) => {
        const value = await this.getApprovedStatementsTotal(p.projectId);
        return { key: 'ev', value, display: `${value.toLocaleString()} ${p.currency || 'EGP'}`, status: 'good' };
      }),
      this.createKpi('pv', 'Planned Value (PV)', 'القيمة المخططة', 'earned_value', 'currency', true, async (p) => {
        const boq = await this.getEmployerBoqTotal(p.projectId);
        const progress = await this.getProjectProgress(p.projectId);
        const pv = boq * (progress / 100);
        return { key: 'pv', value: pv, display: `${pv.toLocaleString()} ${p.currency || 'EGP'}`, status: 'good' };
      }),
      this.createKpi('ac', 'Actual Cost (AC)', 'التكلفة الفعلية', 'earned_value', 'currency', false, async (p) => {
        const payments = await this.getPaymentsTotal(p.projectId);
        return { key: 'ac', value: payments, display: `${payments.toLocaleString()} ${p.currency || 'EGP'}`, status: 'good' };
      }),
      this.createKpi('cpi', 'Cost Performance Index (CPI)', 'مؤشر أداء التكلفة', 'earned_value', 'ratio', true, async (p) => {
        const ev = await this.getKpiValue('ev', p);
        const ac = await this.getKpiValue('ac', p);
        const cpi = ac > 0 ? ev / ac : 1;
        return { key: 'cpi', value: cpi, display: cpi.toFixed(2), trend: cpi >= 1 ? 'up' : 'down', threshold: { warning: 0.95, critical: 0.8 }, status: cpi >= 1 ? 'good' : cpi >= 0.8 ? 'warning' : 'critical' };
      }),
      this.createKpi('spi', 'Schedule Performance Index (SPI)', 'مؤشر أداء الجدول', 'earned_value', 'ratio', true, async (p) => {
        const ev = await this.getKpiValue('ev', p);
        const pv = await this.getKpiValue('pv', p);
        const spi = pv > 0 ? ev / pv : 1;
        return { key: 'spi', value: spi, display: spi.toFixed(2), trend: spi >= 1 ? 'up' : 'down', threshold: { warning: 0.95, critical: 0.8 }, status: spi >= 1 ? 'good' : spi >= 0.8 ? 'warning' : 'critical' };
      }),
      this.createKpi('burn_rate', 'Burn Rate', 'معدل الصرف', 'financial', 'currency/month', false, async (p) => {
        const totalPayments = await this.getPaymentsTotal(p.projectId);
        const months = await this.getProjectMonths(p.projectId);
        const rate = months > 0 ? totalPayments / months : 0;
        return { key: 'burn_rate', value: rate, display: `${rate.toLocaleString()} ${p.currency || 'EGP'}/month`, status: rate > 0 ? 'warning' : 'good' };
      }),
      this.createKpi('cash_flow', 'Cash Flow', 'التدفق النقدي', 'financial', 'currency', true, async (p) => {
        const received = await this.getClientPaymentsTotal(p.projectId);
        const paid = await this.getPaymentsTotal(p.projectId);
        const flow = received - paid;
        return { key: 'cash_flow', value: flow, display: `${flow.toLocaleString()} ${p.currency || 'EGP'}`, trend: flow >= 0 ? 'up' : 'down', status: flow >= 0 ? 'good' : 'critical' };
      }),
      this.createKpi('project_health', 'Project Health', 'صحة المشروع', 'performance', 'score', true, async (p) => {
        const cpi = await this.getKpiValue('cpi', p);
        const spi = await this.getKpiValue('spi', p);
        const score = ((cpi + spi) / 2) * 100;
        return { key: 'project_health', value: score, display: `${score.toFixed(0)}%`, status: score >= 80 ? 'good' : score >= 60 ? 'warning' : 'critical', details: { cpi: cpi.toFixed(2), spi: spi.toFixed(2) } };
      }),
      this.createKpi('delay_risk', 'Delay Risk', 'مخاطر التأخير', 'risk', 'percent', false, async (p) => {
        const spi = await this.getKpiValue('spi', p);
        const risk = Math.max(0, (1 - spi) * 100);
        return { key: 'delay_risk', value: risk, display: `${risk.toFixed(0)}%`, status: risk < 10 ? 'good' : risk < 25 ? 'warning' : 'critical' };
      }),
      this.createKpi('contractor_performance', 'Contractor Performance', 'أداء المقاول', 'performance', 'score', true, async (p) => {
        const stats = await this.getStatementStats(p.projectId);
        const score = stats.total > 0 ? (stats.final / stats.total) * 100 : 100;
        return { key: 'contractor_performance', value: score, display: `${score.toFixed(0)}%`, status: score >= 80 ? 'good' : score >= 60 ? 'warning' : 'critical', details: stats };
      }),
      this.createKpi('boq_profit', 'BOQ Profit', 'ربح بنود الكميات', 'boq', 'currency', true, async (p) => {
        const employerTotal = await this.getEmployerBoqTotal(p.projectId);
        const contractorTotal = await this.getContractorBoqTotal(p.projectId);
        const profit = employerTotal - contractorTotal;
        return { key: 'boq_profit', value: profit, display: `${profit.toLocaleString()} ${p.currency || 'EGP'}`, status: profit >= 0 ? 'good' : 'critical', details: { employerTotal, contractorTotal } };
      }),
      this.createKpi('boq_margin', 'BOQ Margin', 'هامش ربح بنود الكميات', 'boq', 'percent', true, async (p) => {
        const employerTotal = await this.getEmployerBoqTotal(p.projectId);
        const contractorTotal = await this.getContractorBoqTotal(p.projectId);
        const margin = employerTotal > 0 ? ((employerTotal - contractorTotal) / employerTotal) * 100 : 0;
        return { key: 'boq_margin', value: margin, display: `${margin.toFixed(1)}%`, status: margin >= 15 ? 'good' : margin >= 5 ? 'warning' : 'critical' };
      }),
      this.createKpi('attendance_rate', 'Attendance Rate', 'نسبة الحضور', 'resources', 'percent', true, async (p) => {
        const att = await this.getAttendanceData(p.projectId);
        return { key: 'attendance_rate', value: att.attendanceRate, display: `${att.attendanceRate.toFixed(1)}%`, status: att.attendanceRate >= 90 ? 'good' : att.attendanceRate >= 70 ? 'warning' : 'critical', details: { present: att.present, total: att.totalRecords } };
      }),
      this.createKpi('absence_rate', 'Absence Rate', 'نسبة الغياب', 'resources', 'percent', false, async (p) => {
        const att = await this.getAttendanceData(p.projectId);
        return { key: 'absence_rate', value: att.absenceRate, display: `${att.absenceRate.toFixed(1)}%`, status: att.absenceRate <= 10 ? 'good' : att.absenceRate <= 30 ? 'warning' : 'critical', details: { absent: att.absent, total: att.total } };
      }),
      this.createKpi('late_rate', 'Late Arrival Rate', 'نسبة التأخير', 'resources', 'percent', false, async (p) => {
        const att = await this.getAttendanceData(p.projectId);
        return { key: 'late_rate', value: att.lateRate, display: `${att.lateRate.toFixed(1)}%`, status: att.lateRate <= 10 ? 'good' : att.lateRate <= 20 ? 'warning' : 'critical', details: { late: att.late, total: att.total } };
      }),
      this.createKpi('avg_work_hours', 'Average Working Hours', 'متوسط ساعات العمل', 'resources', 'hours', true, async (p) => {
        const att = await this.getAttendanceData(p.projectId);
        return { key: 'avg_work_hours', value: att.averageWorkingHours, display: `${att.averageWorkingHours.toFixed(1)}h`, status: att.averageWorkingHours >= 8 ? 'good' : 'warning' };
      }),
      this.createKpi('overtime_hours', 'Overtime Hours', 'ساعات العمل الإضافي', 'resources', 'hours', false, async (p) => {
        const att = await this.getAttendanceData(p.projectId);
        return { key: 'overtime_hours', value: att.overtimeHours, display: `${att.overtimeHours.toFixed(1)}h`, status: att.overtimeHours > 0 ? 'warning' : 'good' };
      }),
      this.createKpi('active_workforce', 'Active Workforce', 'القوى العاملة النشطة', 'resources', 'count', true, async (p) => {
        const att = await this.getAttendanceData(p.projectId);
        return { key: 'active_workforce', value: att.activeWorkforce, display: `${att.activeWorkforce}`, status: att.activeWorkforce >= 10 ? 'good' : 'warning' };
      }),
    ];

    this.kpis = kpiList;
  }

  getRegisteredKpis() {
    return this.kpis.map((k) => ({
      key: k.key, name: k.name, nameArabic: k.nameArabic,
      description: k.description, category: k.category,
      unit: k.unit, higherIsBetter: k.higherIsBetter,
    }));
  }

  async evaluateKpi(key: string, projectId?: string): Promise<KpiResult | null> {
    const kpi = this.kpis.find((k) => k.key === key);
    if (!kpi) return null;
    return kpi.calculate({ projectId, currency: 'EGP' });
  }

  async evaluateAll(projectId?: string): Promise<KpiResult[]> {
    const results: KpiResult[] = [];
    for (const kpi of this.kpis) {
      try {
        const result = await kpi.calculate({ projectId, currency: 'EGP' });
        results.push(result);
      } catch (err: any) {
        this.logger.error(`KPI ${kpi.key} failed: ${err.message}`);
        results.push({ key: kpi.key, value: 0, display: 'N/A', status: 'critical', details: { error: err.message } });
      }
    }
    return results;
  }

  async getProjectDashboard(projectId: string) {
    const kpis = await this.evaluateAll(projectId);
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true, status: true, progress: true, startDate: true },
    });

    const summary = {
      projectName: project?.name || 'Unknown',
      status: project?.status || 'unknown',
      progress: project?.progress || 0,
    };

    const details = {
      buildings: await this.getBuildingCount(projectId),
      statements: await this.getStatementStats(projectId),
      attendance: await this.getAttendanceBreakdown(projectId),
    };
    return { summary, kpis, details };
  }

  /** Full attendance intelligence for the project (reused by attendance KPIs and dashboard). */
  async getAttendanceData(projectId: string): Promise<{
    totalRecords: number; total: number; present: number; late: number; absent: number;
    attendanceRate: number; absenceRate: number; lateRate: number;
    averageWorkingHours: number; overtimeHours: number; activeWorkforce: number;
  }> {
    const records = await this.prisma.attendance.findMany({
      where: { projectId, deletedAt: null },
      select: { employeeId: true, workedMinutes: true, hoursWorked: true, attendanceStatus: true, status: true },
    });

    const isPresent = (a: { attendanceStatus: string; status: string }) =>
      ['present', 'checkedin', 'checkedout', 'late', 'pending'].includes(a.attendanceStatus.toLowerCase());
    const isLate = (a: { attendanceStatus: string; status: string }) => a.attendanceStatus.toLowerCase() === 'late' || a.status.toLowerCase() === 'late';
    const isAbsent = (a: { attendanceStatus: string; status: string }) => a.attendanceStatus.toLowerCase() === 'absent' || a.status.toLowerCase() === 'absent';

    const total = records.length;
    const present = records.filter(isPresent).length;
    const late = records.filter(isLate).length;
    const absent = records.filter(isAbsent).length;
    const attendanceRate = total > 0 ? (present / total) * 100 : 0;
    const absenceRate = total > 0 ? (absent / total) * 100 : 0;
    const lateRate = total > 0 ? (late / total) * 100 : 0;

    const presentRecords = records.filter((a) => isPresent(a) && (Number(a.hoursWorked) > 0 || Number(a.workedMinutes ?? 0) > 0)).length;
    const totalRecords = records
      .filter((a) => isPresent(a))
      .reduce((s, a) => s + Number(a.hoursWorked || 0) + Number(a.workedMinutes ?? 0) / 60, 0);
    const averageWorkingHours = presentRecords > 0 ? totalRecords / presentRecords : 0;
    const overtimeHours = records.reduce((s, a) => s + Math.max(0, (Number(a.workedMinutes ?? 0) - 480) / 60), 0);

    const activeWorkforce = new Set(records.filter((a) => isPresent(a)).map((a) => a.employeeId)).size;

    return { totalRecords: total, total, present, late, absent, attendanceRate, absenceRate, lateRate, averageWorkingHours, overtimeHours, activeWorkforce };
  }

  private async getAttendanceBreakdown(projectId: string): Promise<Record<string, any>> {
    const _ = await this.getAttendanceData(projectId);
    const buildings = await this.prisma.building.findMany({ where: { projectId }, select: { id: true, name: true } });
    const buildingName = new Map(buildings.map((b) => [b.id, b.name]));
    const records = await this.prisma.attendance.findMany({
      where: { projectId, deletedAt: null },
      select: { buildingId: true, attendanceStatus: true, status: true },
    });
    const byBuilding = new Map<string, { name: string; total: number; present: number }>();
    const isPresent = (a: { attendanceStatus: string; status: string }) =>
      ['present', 'checkedin', 'checkedout', 'late', 'pending'].includes(a.attendanceStatus.toLowerCase());
    for (const r of records) {
      const key = r.buildingId ?? 'unassigned';
      const entry = byBuilding.get(key) ?? { name: key === 'unassigned' ? 'Unassigned' : (buildingName.get(key) ?? 'Unknown'), total: 0, present: 0 };
      entry.total += 1;
      if (isPresent(r)) entry.present += 1;
      byBuilding.set(key, entry);
    }
    return {
      attendanceRate: _.attendanceRate,
      present: _.present,
      total: _.total,
      activeWorkforce: _.activeWorkforce,
      byBuilding: Array.from(byBuilding.values()).map((b) => ({ ...b, attendanceRate: b.total > 0 ? (b.present / b.total) * 100 : 0 })).sort((a, b) => b.total - a.total),
    };
  }

  private createKpi(key: string, name: string, nameArabic: string, category: string, unit: string, higherIsBetter: boolean, calculate: (params: any) => Promise<KpiResult>): KpiDefinition {
    return KpiDefinition.create({ key, name, nameArabic, description: '', category: category as any, unit, higherIsBetter, calculate });
  }

  private async getKpiValue(key: string, params: any): Promise<number> {
    const result = await this.evaluateKpi(key, params.projectId);
    return result?.value ?? 0;
  }

  private async getProjectProgress(projectId: string): Promise<number> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { progress: true } });
    return project?.progress || 0;
  }

  private async getProjectMonths(projectId: string): Promise<number> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { startDate: true } });
    if (!project?.startDate) return 1;
    return Math.max(1, Math.ceil((Date.now() - project.startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  }

  private async getApprovedStatementsTotal(projectId: string): Promise<number> {
    const buildings = await this.prisma.building.findMany({ where: { projectId }, select: { id: true } });
    const buildingIds = buildings.map((b) => b.id);
    if (buildingIds.length === 0) return 0;

    const contractorBoqs = await this.prisma.contractorBoq.findMany({ where: { buildingId: { in: buildingIds } }, select: { id: true } });
    const boqIds = contractorBoqs.map((b) => b.id);
    if (boqIds.length === 0) return 0;

    const statements = await this.prisma.statement.findMany({
      where: { contractorBoqId: { in: boqIds }, status: 'final' },
      select: { netPayable: true },
    });
    return statements.reduce((sum: number, s: any) => sum + Number(s.netPayable || 0), 0);
  }

  private async getPaymentsTotal(projectId: string): Promise<number> {
    const buildings = await this.prisma.building.findMany({ where: { projectId }, select: { id: true } });
    const buildingIds = buildings.map((b) => b.id);
    if (buildingIds.length === 0) return 0;
    const payments = await this.prisma.payment.findMany({
      where: { buildingId: { in: buildingIds } },
      select: { amount: true },
    });
    return payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  }

  private async getClientPaymentsTotal(projectId: string): Promise<number> {
    return this.getPaymentsTotal(projectId);
  }

  private async getEmployerBoqTotal(projectId: string): Promise<number> {
    const buildings = await this.prisma.building.findMany({ where: { projectId }, select: { id: true } });
    const ids = buildings.map((b) => b.id);
    if (ids.length === 0) return 0;
    const items = await this.prisma.employerBoqItem.findMany({
      where: { buildingId: { in: ids } },
      select: { totalValue: true },
    });
    return items.reduce((sum: number, i: any) => sum + Number(i.totalValue || 0), 0);
  }

  private async getContractorBoqTotal(projectId: string): Promise<number> {
    const buildings = await this.prisma.building.findMany({ where: { projectId }, select: { id: true } });
    const ids = buildings.map((b) => b.id);
    if (ids.length === 0) return 0;
    const items = await this.prisma.contractorBoqItem.findMany({
      where: { contractorBoq: { buildingId: { in: ids } } },
      select: { totalValue: true },
    });
    return items.reduce((sum: number, i: any) => sum + Number(i.totalValue || 0), 0);
  }

  private async getStatementStats(projectId: string): Promise<{ total: number; running: number; final: number }> {
    const buildings = await this.prisma.building.findMany({ where: { projectId }, select: { id: true } });
    const buildingIds = buildings.map((b) => b.id);
    if (buildingIds.length === 0) return { total: 0, running: 0, final: 0 };

    const contractorBoqs = await this.prisma.contractorBoq.findMany({ where: { buildingId: { in: buildingIds } }, select: { id: true } });
    const boqIds = contractorBoqs.map((b) => b.id);
    if (boqIds.length === 0) return { total: 0, running: 0, final: 0 };

    const statements = await this.prisma.statement.findMany({
      where: { contractorBoqId: { in: boqIds } },
      select: { status: true },
    });
    return {
      total: statements.length,
      running: statements.filter((s) => s.status === 'running').length,
      final: statements.filter((s) => s.status === 'final').length,
    };
  }

  private async getBuildingCount(projectId: string): Promise<number> {
    return this.prisma.building.count({ where: { projectId } });
  }
}
