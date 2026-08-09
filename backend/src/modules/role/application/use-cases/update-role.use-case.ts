import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IRoleRepository } from '../../domain/role.repository';
import { UpdateRoleInput, RoleResult } from '../dto/role.dto';
import { toResult } from './list-roles.use-case';

export class UpdateRoleUseCase {
  constructor(private readonly roles: IRoleRepository) {}

  async execute(input: UpdateRoleInput): Promise<Result<RoleResult>> {
    const role = await this.roles.findById(new UniqueEntityId(input.id));
    if (!role) return Result.fail(new Error('Role not found'));
    const updateResult = role.update({ name: input.name, description: input.description, permissions: input.permissions, status: input.status });
    if (updateResult.isFailure) return Result.fail(updateResult.error as Error);
    await this.roles.save(role);
    return Result.ok(toResult(role));
  }
}
