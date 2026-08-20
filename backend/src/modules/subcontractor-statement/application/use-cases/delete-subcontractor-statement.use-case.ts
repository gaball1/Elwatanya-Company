import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { ISubcontractorStatementRepository } from '../../domain/subcontractor-statement.repository';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';

export class DeleteSubcontractorStatementUseCase {
  constructor(
    private readonly repo: ISubcontractorStatementRepository,
    private readonly ownership: OwnershipService,
  ) {}
  async execute(id: string, user: OwnershipActor | undefined): Promise<Result<void>> {
    const statement = await this.repo.findById(new UniqueEntityId(id));
    if (!statement) return Result.fail(new Error('Subcontractor statement not found'));

    await this.ownership.verifyProjectAccess(user, statement.projectId);

    if (statement.status === 'approved') {
      return Result.fail(new Error('Cannot delete an approved subcontractor statement'));
    }
    const deleteResult = statement.softDelete();
    if (deleteResult.isFailure) return Result.fail(deleteResult.error as Error);
    await this.repo.save(statement);
    return Result.ok();
  }
}
