import { Result } from '@/shared/kernel/result';
import { ClientStatement } from '../../domain/client-statement.entity';
import { ClientStatementResult } from '../dto/client-statement.dto';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';

export function toResult(s: ClientStatement): ClientStatementResult {
  return {
    id: s.id.toValue(),
    statementNumber: s.statementNumber,
    projectId: s.projectId,
    projectName: s.projectName,
    buildingId: s.buildingId,
    buildingName: s.buildingName,
    clientId: s.clientId,
    clientName: s.clientName,
    date: s.date,
    status: s.status,
    totalWorkValue: s.totalWorkValue,
    totalDeductions: s.totalDeductions,
    netPayable: s.netPayable,
    items: s.items,
    deductions: s.deductions,
    signatures: s.signatures,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export class ListClientStatementsUseCase {
  constructor(
    private readonly repo: import('../../domain/client-statement.repository').IClientStatementRepository,
    private readonly ownership: OwnershipService,
  ) {}

  async execute(user?: OwnershipActor): Promise<Result<ClientStatementResult[]>> {
    const accessible = this.ownership.getAccessibleProjectIds(user);
    if (accessible === null) {
      const list = await this.repo.findAll();
      return Result.ok(list.map(toResult));
    }
    if (accessible.length === 0) return Result.ok([]);
    const list = await this.repo.findAll();
    return Result.ok(list.filter((s) => accessible.includes(s.projectId)).map(toResult));
  }
}
