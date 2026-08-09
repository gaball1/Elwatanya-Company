import { Result } from '@/shared/kernel/result';
import { SubcontractorStatement } from '../../domain/subcontractor-statement.entity';
import { SubcontractorStatementResult } from '../dto/subcontractor-statement.dto';

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
  async execute(): Promise<Result<SubcontractorStatementResult[]>> {
    const list = await this.repo.findAll();
    return Result.ok(list.map(toResult));
  }
}
