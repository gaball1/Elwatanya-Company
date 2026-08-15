import { Result } from '@/shared/kernel/result';
import { SubcontractorStatement } from '../../domain/subcontractor-statement.entity';
import { SubcontractorStatementResult } from '../dto/subcontractor-statement.dto';
import { OwnershipActor } from '@/common/services/ownership.service';

export function toResult(s: SubcontractorStatement): SubcontractorStatementResult {
  return {
    id: s.id.toValue(), statementNumber: s.statementNumber, projectId: s.projectId,
    projectName: s.projectName, buildingId: s.buildingId, buildingName: s.buildingName,
    subcontractorId: s.subcontractorId, subcontractorName: s.subcontractorName, workType: s.workType,
    date: s.date, status: s.status, blockNumber: s.blockNumber, formNumber: s.formNumber,
    insurancePercent: s.insurancePercent, totalWorkValue: s.totalWorkValue,
    totalInsurance: s.totalInsurance, totalDeductions: s.totalDeductions, previousPaid: s.previousPaid,
    netPayable: s.netPayable, runningNumber: s.runningNumber, items: s.items, deductions: s.deductions,
    signatures: s.signatures, createdAt: s.createdAt, updatedAt: s.updatedAt,
  };
}

export class ListSubcontractorStatementsUseCase {
  constructor(private readonly repo: import('../../domain/subcontractor-statement.repository').ISubcontractorStatementRepository) {}

  async execute(actor?: OwnershipActor): Promise<Result<SubcontractorStatementResult[]>> {
    const list = await this.repo.findAll();

    // SUPER_ADMIN sees everything; others only statements from assigned projects.
    let allowed: string[] | null = null;
    if (actor && typeof actor === 'object') {
      if (!(Array.isArray(actor.roleNames) && actor.roleNames.includes('SUPER_ADMIN'))) {
        allowed = actor.projectIds?.length ? actor.projectIds : actor.projectId ? [actor.projectId] : [];
      }
    } else if (actor) {
      allowed = [actor];
    }

    if (allowed === null) return Result.ok(list.map(toResult));
    if (allowed.length === 0) return Result.ok([]);
    return Result.ok(list.filter((s) => allowed!.includes(s.projectId)).map(toResult));
  }
}
