import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IClientRepository } from '../../domain/client.repository';
import { ClientResult } from '../dto/client.dto';
import { toResult } from './list-clients.use-case';

export class GetClientUseCase {
  constructor(private readonly clients: IClientRepository) {}

  async execute(id: string): Promise<Result<ClientResult | null>> {
    const client = await this.clients.findById(new UniqueEntityId(id));
    if (!client) return Result.ok(null);
    return Result.ok(toResult(client));
  }
}
