import { Result } from '@/shared/kernel/result';
import { ISubcontractorStatementRepository } from '../../domain/subcontractor-statement.repository';
import { CreateSubcontractorStatementInput, SubcontractorStatementResult } from '../dto/subcontractor-statement.dto';
import { SubcontractorStatement } from '../../domain/subcontractor-statement.entity';
import { toResult } from './list-subcontractor-statements.use-case';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';

export class CreateSubcontractorStatementUseCase {
  constructor(
    private readonly repo: ISubcontractorStatementRepository,
    private readonly ownership: OwnershipService,
  ) {}
  async execute(input: CreateSubcontractorStatementInput, user: OwnershipActor | undefined, userId?: string): Promise<Result<SubcontractorStatementResult>> {
    await this.ownership.verifyProjectAccess(user, input.projectId);
    const createdBy = userId ?? 'system';

    const result = SubcontractorStatement.create(input);
    if (result.isFailure) return Result.fail(result.error as Error);
    const statement = result.getValue();
    await this.repo.save(statement);
    return Result.ok(toResult(statement));
  }
}
