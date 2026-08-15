import { Result } from '@/shared/kernel/result';
import { ClientStatement } from '../../domain/client-statement.entity';
import { ClientStatementResult } from '../dto/client-statement.dto';
import { OwnershipActor } from '@/common/services/ownership.service';

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
  constructor(private readonly repo: import('../../domain/client-statement.repository').IClientStatementRepository) {}

  async execute(actor?: OwnershipActor): Promise<Result<ClientStatementResult[]>> {
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
