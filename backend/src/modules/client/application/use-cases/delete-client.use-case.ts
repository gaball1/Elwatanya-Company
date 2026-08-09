import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IClientRepository } from '../../domain/client.repository';

export class DeleteClientUseCase {
  constructor(private readonly clients: IClientRepository) {}

  async execute(id: string): Promise<Result<void>> {
    const client = await this.clients.findById(new UniqueEntityId(id));
    if (!client) return Result.fail(new Error('Client not found'));

    const deleteResult = client.softDelete();
    if (deleteResult.isFailure) return Result.fail(deleteResult.error as Error);

    await this.clients.save(client);
    return Result.ok();
  }
}
