import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { ISubcontractorStatementRepository } from '../../domain/subcontractor-statement.repository';
import { UpdateSubcontractorStatementInput, SubcontractorStatementResult } from '../dto/subcontractor-statement.dto';
import { toResult } from './list-subcontractor-statements.use-case';

export class UpdateSubcontractorStatementUseCase {
  constructor(private readonly repo: ISubcontractorStatementRepository) {}
  async execute(input: UpdateSubcontractorStatementInput): Promise<Result<SubcontractorStatementResult>> {
    const statement = await this.repo.findById(new UniqueEntityId(input.id));
    if (!statement) return Result.fail(new Error('Subcontractor statement not found'));
    if (statement.status === 'approved') {
      return Result.fail(new Error('Cannot edit an approved subcontractor statement'));
    }
    const updateResult = statement.update(input);
    if (updateResult.isFailure) return Result.fail(updateResult.error as Error);
    await this.repo.save(statement);
    return Result.ok(toResult(statement));
  }
}
