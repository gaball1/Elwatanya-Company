import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IClientRepository } from '../../domain/client.repository';
import { UpdateClientInput, ClientResult } from '../dto/client.dto';
import { toResult } from './list-clients.use-case';

export class UpdateClientUseCase {
  constructor(private readonly clients: IClientRepository) {}

  async execute(input: UpdateClientInput): Promise<Result<ClientResult>> {
    const client = await this.clients.findById(new UniqueEntityId(input.id));
    if (!client) return Result.fail(new Error('Client not found'));

    const updateResult = client.update({
      name: input.name,
      email: input.email,
      phone: input.phone,
      address: input.address,
      contactPerson: input.contactPerson,
      joinDate: input.joinDate,
      status: input.status,
    });

    if (updateResult.isFailure) return Result.fail(updateResult.error as Error);

    await this.clients.save(client);
    return Result.ok(toResult(client));
  }
}
