import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { IReportHandler, ReportData, GenerateReportParams } from '../domain/report-handler.interface';
import { ReportDefinition, ReportDefinitionProps } from '../domain/report-definition.entity';

@Injectable()
export class ProjectListReport implements IReportHandler {
  private readonly definition: ReportDefinition;

  constructor(private readonly prisma: PrismaService) {
    const props: ReportDefinitionProps = {
      name: 'project_list',
      displayName: 'Project List',
      description: 'List of all projects with status, progress, and location',
      category: 'projects',
      supportedFormats: ['pdf', 'excel', 'csv'],
      parameterSchema: {
        status: { type: 'string', enum: ['active', 'completed', 'on_hold', ''], default: '' },
      },
      requiresProject: false,
      requiresBuilding: false,
    };
    this.definition = ReportDefinition.create(props);
  }

  getDefinition(): ReportDefinition {
    return this.definition;
  }

  async generate(params: GenerateReportParams, _user: any): Promise<ReportData> {
    const statusFilter = params.filters?.status;
    const projects = await this.prisma.project.findMany({
      where: {
        deletedAt: null,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      orderBy: { name: 'asc' },
    });

    const rows = projects.map((p) => ({
      Code: p.code ?? '',
      Name: p.name,
      Client: p.client ?? '',
      Location: p.location ?? '',
      Status: p.status,
      Progress: `${p.progress ?? 0}%`,
      StartDate: p.startDate ? p.startDate.toISOString().slice(0, 10) : '',
    }));

    const totals = {
      'Total Projects': rows.length,
      Active: rows.filter((r) => r.Status === 'active').length,
      Completed: rows.filter((r) => r.Status === 'completed').length,
      OnHold: rows.filter((r) => r.Status === 'on_hold').length,
    };

    return { rows, summary: totals };
  }
}