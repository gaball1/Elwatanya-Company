import { Result } from '@/shared/kernel/result';
import { Role } from '../../domain/role.entity';
import { RoleResult } from '../dto/role.dto';

export function toResult(r: Role): RoleResult {
  return {
    id: r.id.toValue(),
    name: r.name,
    description: r.description,
    permissions: [...r.permissions],
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class ListRolesUseCase {
  constructor(private readonly roles: import('../../domain/role.repository').IRoleRepository) {}

  async execute(): Promise<Result<RoleResult[]>> {
    const list = await this.roles.findAll();
    return Result.ok(list.map(toResult));
  }
}
