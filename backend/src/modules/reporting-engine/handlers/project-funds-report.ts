import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { IReportHandler, ReportData, GenerateReportParams } from '../domain/report-handler.interface';
import { ReportDefinition, ReportDefinitionProps } from '../domain/report-definition.entity';

@Injectable()
export class ProjectFundsReport implements IReportHandler {
  private readonly definition: ReportDefinition;

  constructor(private readonly prisma: PrismaService) {
    const props: ReportDefinitionProps = {
      name: 'project_funds',
      displayName: 'Project Funds (عهدة)',
      description: 'Treasury fund balances per project (initial vs current balance)',
      category: 'treasury',
      supportedFormats: ['pdf', 'excel', 'csv'],
      parameterSchema: {
        projectId: { type: 'string', default: '' },
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
    const projectNameMap = new Map<string, string>();
    const projects = await this.prisma.project.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
    });
    for (const p of projects) projectNameMap.set(p.id, p.name);

    const funds = await this.prisma.projectFund.findMany({
      where: {
        deletedAt: null,
        ...(params.projectId ? { projectId: params.projectId } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });

    const rows = funds.map((f) => ({
      Project: projectNameMap.get(f.projectId) ?? f.projectId,
      'Initial Balance': Number(f.initialBalance).toFixed(2),
      'Current Balance': Number(f.currentBalance).toFixed(2),
      Difference: (Number(f.currentBalance) - Number(f.initialBalance)).toFixed(2),
      'Last Updated': f.lastUpdated.toISOString().slice(0, 10),
    }));

    const totalInitial = funds.reduce((sum, f) => sum + Number(f.initialBalance), 0);
    const totalCurrent = funds.reduce((sum, f) => sum + Number(f.currentBalance), 0);

    return {
      rows,
      summary: {
        'Funds Count': funds.length,
        'Total Initial': totalInitial.toFixed(2),
        'Total Current': totalCurrent.toFixed(2),
      },
    };
  }
}