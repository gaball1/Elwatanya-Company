import { Result } from '@/shared/kernel/result';
import { Client } from '../../domain/client.entity';
import { ClientResult } from '../dto/client.dto';

export function toResult(c: Client): ClientResult {
  return {
    id: c.id.toValue(),
    name: c.name,
    email: c.email,
    phone: c.phone,
    address: c.address,
    contactPerson: c.contactPerson,
    joinDate: c.joinDate,
    status: c.status,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export class ListClientsUseCase {
  constructor(private readonly clients: import('../../domain/client.repository').IClientRepository) {}

  async execute(): Promise<Result<ClientResult[]>> {
    const list = await this.clients.findAll();
    return Result.ok(list.map(toResult));
  }
}
