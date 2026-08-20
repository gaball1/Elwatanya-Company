import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IClientStatementRepository } from '../../domain/client-statement.repository';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';

export class DeleteClientStatementUseCase {
  constructor(
    private readonly repo: IClientStatementRepository,
    private readonly ownership: OwnershipService,
  ) {}

  async execute(id: string, user: OwnershipActor | undefined): Promise<Result<void>> {
    const statement = await this.repo.findById(new UniqueEntityId(id));
    if (!statement) return Result.fail(new Error('Client statement not found'));

    await this.ownership.verifyProjectAccess(user, statement.projectId);

    if (statement.status === 'approved') {
      return Result.fail(new Error('Cannot delete an approved client statement'));
    }

    const deleteResult = statement.softDelete();
    if (deleteResult.isFailure) return Result.fail(deleteResult.error as Error);

    await this.repo.save(statement);
    return Result.ok();
  }
}
