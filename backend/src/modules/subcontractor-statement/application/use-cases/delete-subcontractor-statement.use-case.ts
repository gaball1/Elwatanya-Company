import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { ISubcontractorStatementRepository } from '../../domain/subcontractor-statement.repository';

export class DeleteSubcontractorStatementUseCase {
  constructor(private readonly repo: ISubcontractorStatementRepository) {}
  async execute(id: string): Promise<Result<void>> {
    const statement = await this.repo.findById(new UniqueEntityId(id));
    if (!statement) return Result.fail(new Error('Subcontractor statement not found'));
    if (statement.status === 'approved') {
      return Result.fail(new Error('Cannot delete an approved subcontractor statement'));
    }
    const deleteResult = statement.softDelete();
    if (deleteResult.isFailure) return Result.fail(deleteResult.error as Error);
    await this.repo.save(statement);
    return Result.ok();
  }
}
