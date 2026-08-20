import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IClientStatementRepository } from '../../domain/client-statement.repository';
import { UpdateClientStatementInput, ClientStatementResult } from '../dto/client-statement.dto';
import { toResult } from './list-client-statements.use-case';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';

export class UpdateClientStatementUseCase {
  constructor(
    private readonly repo: IClientStatementRepository,
    private readonly ownership: OwnershipService,
  ) {}

  async execute(input: UpdateClientStatementInput, user: OwnershipActor | undefined, userId?: string): Promise<Result<ClientStatementResult>> {
    const statement = await this.repo.findById(new UniqueEntityId(input.id));
    if (!statement) return Result.fail(new Error('Client statement not found'));

    await this.ownership.verifyProjectAccess(user, statement.projectId);

    if (statement.status === 'approved') {
      return Result.fail(new Error('Cannot edit an approved client statement'));
    }

    const updateResult = statement.update(input);
    if (updateResult.isFailure) return Result.fail(updateResult.error as Error);

    await this.repo.save(statement);
    return Result.ok(toResult(statement));
  }
}
