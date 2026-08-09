import { Result } from '@/shared/kernel/result';
import { IClientRepository } from '../../domain/client.repository';
import { CreateClientInput, ClientResult } from '../dto/client.dto';
import { Client } from '../../domain/client.entity';
import { toResult } from './list-clients.use-case';

export class CreateClientUseCase {
  constructor(private readonly clients: IClientRepository) {}

  async execute(input: CreateClientInput): Promise<Result<ClientResult>> {
    const result = Client.create({
      name: input.name,
      email: input.email,
      phone: input.phone,
      address: input.address,
      contactPerson: input.contactPerson,
      joinDate: input.joinDate,
      status: input.status,
    });

    if (result.isFailure) return Result.fail(result.error as Error);

    const client = result.getValue();
    await this.clients.save(client);
    return Result.ok(toResult(client));
  }
}
