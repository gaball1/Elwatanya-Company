import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PdfEngineService } from '../../pdf-engine/application/pdf-engine.service';
import { QrCodeService } from '../../pdf-engine/application/qr-code.service';
import { BaseTemplate, TemplateParams } from './base-template';

@Injectable()
export class PayrollReportTemplate extends BaseTemplate {
  readonly name = 'payroll_report';
  readonly displayName = 'Payroll Report';
  readonly description = 'Monthly payroll report with employee salaries and totals';
  readonly requiresProject = true;
  readonly requiresBuilding = false;

  constructor(prisma: PrismaService, pdfEngine: PdfEngineService, qrCode: QrCodeService) {
    super(prisma, pdfEngine, qrCode);
  }

  protected getArabicTitle(): string {
    return 'تقرير الرواتب والأجور';
  }

  async buildSections(params: TemplateParams): Promise<string> {
    const employees = await this.prisma.employee.findMany({
      orderBy: { fullName: 'asc' },
    });

    const totalSalary = employees.reduce((s, e) => s + Number(e.salary || 0), 0);
    const activeEmployees = employees.filter(e => e.status === 'active').length;

    return `
      ${this.kpiRow([
        { label: 'Total Employees', value: employees.length.toString(), color: '#1e40af' },
        { label: 'Active', value: activeEmployees.toString(), color: '#059669' },
        { label: 'Total Monthly Salary', value: `${totalSalary.toLocaleString()} EGP`, color: '#0891b2' },
      ])}
      ${this.card('Employee Salary Register', this.table(
        ['Employee', 'Code', 'Department', 'Role', 'Salary'],
        employees.map(e => [
          e.fullName, e.code,
          e.departmentId || '', e.roleId || '',
          `${Number(e.salary || 0).toLocaleString()} EGP`,
        ]),
        ['', '', '', 'Total Payroll', `${totalSalary.toLocaleString()} EGP`],
      ))}
      ${this.note(`Payroll register. Total monthly salary obligation: ${totalSalary.toLocaleString()} EGP for ${employees.length} employees.`)}
    `;
  }

  async buildExecutiveSummary(params: TemplateParams): Promise<string> {
    const employees = await this.prisma.employee.findMany();
    const total = employees.reduce((s, e) => s + Number(e.salary || 0), 0);
    return `<p>Payroll: <strong>${employees.length} employees</strong>, total monthly salary <strong>${total.toLocaleString()} EGP</strong>.</p>`;
  }
}
