import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PdfEngineService } from '../../pdf-engine/application/pdf-engine.service';
import { QrCodeService } from '../../pdf-engine/application/qr-code.service';
import { BaseTemplate, TemplateParams } from './base-template';

@Injectable()
export class AttendanceReportTemplate extends BaseTemplate {
  readonly name = 'attendance_report';
  readonly displayName = 'Attendance Report';
  readonly description = 'Monthly employee attendance summary with present/absent/late records';
  readonly requiresProject = true;
  readonly requiresBuilding = false;

  constructor(prisma: PrismaService, pdfEngine: PdfEngineService, qrCode: QrCodeService) {
    super(prisma, pdfEngine, qrCode);
  }

  protected getArabicTitle(): string {
    return 'تقرير الحضور والانصراف';
  }

  async buildSections(params: TemplateParams): Promise<string> {
    const month = params.month || new Date().getMonth() + 1;
    const year = params.year || new Date().getFullYear();
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const [records, employeesActive] = await Promise.all([
      this.prisma.attendance.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          ...(params.projectId ? { projectId: params.projectId } : {}),
        },
        include: { employee: { include: { department: true } } },
        orderBy: [{ employee: { fullName: 'asc' } }, { date: 'asc' }],
      }),
      this.prisma.employee.count({ where: { deletedAt: null, status: 'active' } }),
    ]);

    const isLate = (r: { attendanceStatus: string; status: string }) => r.attendanceStatus.toLowerCase() === 'late' || r.status.toLowerCase() === 'late';
    const isAbsent = (r: { attendanceStatus: string; status: string }) => r.attendanceStatus.toLowerCase() === 'absent' || r.status.toLowerCase() === 'absent';
    const isPresent = (r: { attendanceStatus: string; status: string }) =>
      ['present', 'checkedin', 'checkedout', 'late', 'pending'].includes(r.attendanceStatus.toLowerCase());

    const totalWorkingDays = endDate.getDate();
    const employees = new Map<string, { name: string; dept: string; present: number; absent: number; late: number; workedMinutes: number }>();
    for (const r of records) {
      if (!employees.has(r.employeeId)) {
        employees.set(r.employeeId, {
          name: r.employee?.fullName || 'Unknown',
          dept: r.employee?.department?.name || '',
          present: 0,
          absent: 0,
          late: 0,
          workedMinutes: 0,
        });
      }
      const emp = employees.get(r.employeeId)!;
      emp.workedMinutes += Number(r.workedMinutes ?? 0) + Number(r.hoursWorked) * 60;
      if (isAbsent(r)) emp.absent++;
      else if (isLate(r)) emp.late++;
      else if (isPresent(r)) emp.present++;
    }

    const summaryRows = Array.from(employees.values()).map((e) => {
      const workedHours = e.workedMinutes / 60;
      const attended = e.present + e.late;
      return [
        e.name,
        e.dept,
        e.present.toString(),
        e.absent.toString(),
        e.late.toString(),
        `${workedHours.toFixed(1)}`,
        `${((attended / totalWorkingDays) * 100).toFixed(1)}%`,
      ];
    });

    const totalPresent = Array.from(employees.values()).reduce((s, e) => s + e.present + e.late, 0);
    const totalAbsent = Array.from(employees.values()).reduce((s, e) => s + e.absent, 0);
    const totalLate = Array.from(employees.values()).reduce((s, e) => s + e.late, 0);
    const attendanceRate = employees.size > 0 ? (totalPresent / (employees.size * totalWorkingDays)) * 100 : 0;
    const activeWorkforce = employees.size;

    return `
      ${this.kpiRow([
        { label: 'Employees Tracked', value: employees.size.toString(), color: '#1e40af' },
        { label: 'Working Days', value: totalWorkingDays.toString(), color: '#64748b' },
        { label: 'Attendance Rate', value: `${attendanceRate.toFixed(1)}%`, color: '#059669' },
        { label: 'Absence Rate', value: `${(totalAbsent / Math.max(1, employees.size * totalWorkingDays) * 100).toFixed(1)}%`, color: '#dc2626' },
        { label: 'Late Arrivals', value: totalLate.toString(), color: '#d97706' },
        { label: 'Active Workforce', value: activeWorkforce.toString(), color: '#7c3aed' },
        { label: 'Total Company Active', value: employeesActive.toString(), color: '#475569' },
      ])}
      ${employees.size > 0 ? this.card('Attendance Summary by Employee', this.table(
        ['Employee', 'Department', 'Present', 'Absent', 'Late', 'Hours Worked', 'Attendance %'],
        summaryRows,
      )) : '<p>No attendance records for this period.</p>'}
      ${this.note(`Attendance report for ${month}/${year}. Total: ${totalPresent} present, ${totalAbsent} absent, ${totalLate} late.`)}
    `;
  }

  async buildExecutiveSummary(params: TemplateParams): Promise<string> {
    const month = params.month || new Date().getMonth() + 1;
    const year = params.year || new Date().getFullYear();
    return `<p>Monthly attendance report for <strong>${month}/${year}</strong>.</p>`;
  }
}
