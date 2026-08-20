import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { ISubcontractorStatementRepository } from '../../domain/subcontractor-statement.repository';
import { UpdateSubcontractorStatementInput, SubcontractorStatementResult } from '../dto/subcontractor-statement.dto';
import { toResult } from './list-subcontractor-statements.use-case';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';

export class UpdateSubcontractorStatementUseCase {
  constructor(
    private readonly repo: ISubcontractorStatementRepository,
    private readonly ownership: OwnershipService,
  ) {}
  async execute(input: UpdateSubcontractorStatementInput, user: OwnershipActor | undefined, userId?: string): Promise<Result<SubcontractorStatementResult>> {
    const statement = await this.repo.findById(new UniqueEntityId(input.id));
    if (!statement) return Result.fail(new Error('Subcontractor statement not found'));

    await this.ownership.verifyProjectAccess(user, statement.projectId);

    if (statement.status === 'approved') {
      return Result.fail(new Error('Cannot edit an approved subcontractor statement'));
    }
    const updateResult = statement.update(input);
    if (updateResult.isFailure) return Result.fail(updateResult.error as Error);
    await this.repo.save(statement);
    return Result.ok(toResult(statement));
  }
}
