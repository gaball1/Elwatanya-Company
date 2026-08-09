import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { IReportHandler, ReportData, GenerateReportParams } from '../domain/report-handler.interface';
import { ReportDefinition, ReportDefinitionProps } from '../domain/report-definition.entity';

@Injectable()
export class PurchasesReport implements IReportHandler {
  private readonly definition: ReportDefinition;

  constructor(private readonly prisma: PrismaService) {
    const props: ReportDefinitionProps = {
      name: 'purchases_list',
      displayName: 'Purchases List',
      description: 'Purchase orders with item, quantity, price, and approval status',
      category: 'purchases',
      supportedFormats: ['pdf', 'excel', 'csv'],
      parameterSchema: {
        projectId: { type: 'string', default: '' },
        status: { type: 'string', enum: ['pending', 'approved', 'received', 'cancelled', ''], default: '' },
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

    const purchases = await this.prisma.purchase.findMany({
      where: {
        deletedAt: null,
        ...(params.projectId ? { projectId: params.projectId } : {}),
        ...(params.filters?.status ? { status: params.filters.status } : {}),
      },
      orderBy: { date: 'desc' },
    });

    const rows = purchases.map((x) => ({
      Project: projectNameMap.get(x.projectId) ?? x.projectId,
      Item: x.itemName,
      Quantity: Number(x.quantity),
      Unit: x.unit,
      'Unit Price': Number(x.unitPrice).toFixed(2),
      Total: Number(x.total).toFixed(2),
      Status: x.status,
      Date: x.date.toISOString().slice(0, 10),
      Supplier: x.supplierName ?? '',
    }));

    const totalAmount = purchases
      .filter((x) => x.status !== 'cancelled')
      .reduce((sum, x) => sum + Number(x.total), 0);

    return {
      rows,
      summary: {
        'Total Purchases': purchases.length,
        'Total Value (excl. cancelled)': totalAmount.toFixed(2),
      },
    };
  }
}