import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const MODEL_MAP: Record<string, { model: string; deletedField: string }> = {
  project: { model: 'project', deletedField: 'deletedAt' },
  building: { model: 'building', deletedField: 'deletedAt' },
  client: { model: 'client', deletedField: 'deletedAt' },
  supplier: { model: 'supplier', deletedField: 'deletedAt' },
  employee: { model: 'employee', deletedField: 'deletedAt' },
  department: { model: 'department', deletedField: 'deletedAt' },
  role: { model: 'role', deletedField: 'deletedAt' },
  'employee-role': { model: 'employeeRole', deletedField: 'deletedAt' },
  attendance: { model: 'attendance', deletedField: 'deletedAt' },
  leave: { model: 'leave', deletedField: 'deletedAt' },
  holiday: { model: 'holiday', deletedField: 'deletedAt' },
  warehouse: { model: 'warehouse', deletedField: 'deletedAt' },
  category: { model: 'category', deletedField: 'deletedAt' },
  'inventory-item': { model: 'inventoryItem', deletedField: 'deletedAt' },
  'stock-movement': { model: 'stockMovement', deletedField: 'deletedAt' },
  'project-fund': { model: 'projectFund', deletedField: 'deletedAt' },
  'fund-transaction': { model: 'fundTransaction', deletedField: 'deletedAt' },
  miscellaneous: { model: 'miscellaneous', deletedField: 'deletedAt' },
  notification: { model: 'notification', deletedField: 'deletedAt' },
  'project-board': { model: 'projectBoard', deletedField: 'deletedAt' },
  'client-statement': { model: 'clientStatement', deletedField: 'deletedAt' },
  'subcontractor-statement': { model: 'subcontractorStatement', deletedField: 'deletedAt' },
  employerboq: { model: 'employerBoq', deletedField: 'deletedAt' },
  analyticalboq: { model: 'analyticalBoq', deletedField: 'deletedAt' },
  finalboq: { model: 'finalBoq', deletedField: 'deletedAt' },
  contractorboq: { model: 'contractorBoq', deletedField: 'deletedAt' },
};

@Injectable()
export class RecycleBinService {
  constructor(private readonly prisma: PrismaService) {}

  async listDeleted(entity?: string) {
    const results: any[] = [];

    const entities = entity ? [entity] : Object.keys(MODEL_MAP);
    for (const key of entities) {
      const mapping = MODEL_MAP[key];
      if (!mapping) continue;
      try {
        const records = await (this.prisma as any)[mapping.model].findMany({
          where: { deletedAt: { not: null } },
          select: { id: true, name: true, deletedAt: true },
          orderBy: { deletedAt: 'desc' },
          take: 50,
        });
        for (const r of records) {
          results.push({ id: r.id, name: r.name ?? r.id, entity: key, deletedAt: r.deletedAt });
        }
      } catch { }
    }

    results.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
    return { items: results };
  }

  async restore(entity: string, id: string) {
    const mapping = MODEL_MAP[entity];
    if (!mapping) throw new Error(`Unknown entity: ${entity}`);

    try {
      await (this.prisma as any)[mapping.model].update({
        where: { id },
        data: { deletedAt: null },
      });
      return { success: true };
    } catch (e: any) {
      throw new Error(`Failed to restore: ${e.message}`);
    }
  }

  async permanentDelete(entity: string, id: string) {
    const mapping = MODEL_MAP[entity];
    if (!mapping) throw new Error(`Unknown entity: ${entity}`);

    try {
      await (this.prisma as any)[mapping.model].delete({ where: { id } });
      return { success: true };
    } catch (e: any) {
      throw new Error(`Failed to permanently delete: ${e.message}`);
    }
  }
}
