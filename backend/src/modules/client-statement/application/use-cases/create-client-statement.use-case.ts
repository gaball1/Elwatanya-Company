import { Result } from '@/shared/kernel/result';
import { IClientStatementRepository } from '../../domain/client-statement.repository';
import { CreateClientStatementInput, ClientStatementResult } from '../dto/client-statement.dto';
import { ClientStatement } from '../../domain/client-statement.entity';
import { toResult } from './list-client-statements.use-case';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';

export class CreateClientStatementUseCase {
  constructor(
    private readonly repo: IClientStatementRepository,
    private readonly ownership: OwnershipService,
  ) {}

  async execute(input: CreateClientStatementInput, user: OwnershipActor | undefined, userId?: string): Promise<Result<ClientStatementResult>> {
    await this.ownership.verifyProjectAccess(user, input.projectId);
    const createdBy = userId ?? 'system';

    const result = ClientStatement.create(input);
    if (result.isFailure) return Result.fail(result.error as Error);
    const statement = result.getValue();
    await this.repo.save(statement);
    return Result.ok(toResult(statement));
  }
}
