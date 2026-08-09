import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IClientStatementRepository } from '../../domain/client-statement.repository';
import { UpdateClientStatementInput, ClientStatementResult } from '../dto/client-statement.dto';
import { toResult } from './list-client-statements.use-case';

export class UpdateClientStatementUseCase {
  constructor(private readonly repo: IClientStatementRepository) {}

  async execute(input: UpdateClientStatementInput): Promise<Result<ClientStatementResult>> {
    const statement = await this.repo.findById(new UniqueEntityId(input.id));
    if (!statement) return Result.fail(new Error('Client statement not found'));

    if (statement.status === 'approved') {
      return Result.fail(new Error('Cannot edit an approved client statement'));
    }

    const updateResult = statement.update(input);
    if (updateResult.isFailure) return Result.fail(updateResult.error as Error);

    await this.repo.save(statement);
    return Result.ok(toResult(statement));
  }
}
