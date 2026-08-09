import { Result } from '@/shared/kernel/result';
import { ISubcontractorStatementRepository } from '../../domain/subcontractor-statement.repository';
import { CreateSubcontractorStatementInput, SubcontractorStatementResult } from '../dto/subcontractor-statement.dto';
import { SubcontractorStatement } from '../../domain/subcontractor-statement.entity';
import { toResult } from './list-subcontractor-statements.use-case';

export class CreateSubcontractorStatementUseCase {
  constructor(private readonly repo: ISubcontractorStatementRepository) {}
  async execute(input: CreateSubcontractorStatementInput): Promise<Result<SubcontractorStatementResult>> {
    const result = SubcontractorStatement.create(input);
    if (result.isFailure) return Result.fail(result.error as Error);
    const statement = result.getValue();
    await this.repo.save(statement);
    return Result.ok(toResult(statement));
  }
}
