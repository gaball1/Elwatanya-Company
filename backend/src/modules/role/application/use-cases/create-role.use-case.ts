import { Result } from '@/shared/kernel/result';
import { IRoleRepository } from '../../domain/role.repository';
import { CreateRoleInput, RoleResult } from '../dto/role.dto';
import { Role } from '../../domain/role.entity';
import { toResult } from './list-roles.use-case';

export class CreateRoleUseCase {
  constructor(private readonly roles: IRoleRepository) {}

  async execute(input: CreateRoleInput): Promise<Result<RoleResult>> {
    const result = Role.create({ name: input.name, description: input.description, permissions: input.permissions, status: input.status });
    if (result.isFailure) return Result.fail(result.error as Error);
    const role = result.getValue();
    await this.roles.save(role);
    return Result.ok(toResult(role));
  }
}
