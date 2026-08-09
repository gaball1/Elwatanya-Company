import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IRoleRepository } from '../../domain/role.repository';

export class DeleteRoleUseCase {
  constructor(private readonly roles: IRoleRepository) {}

  async execute(id: string): Promise<Result<void>> {
    const role = await this.roles.findById(new UniqueEntityId(id));
    if (!role) return Result.fail(new Error('Role not found'));
    const deleteResult = role.softDelete();
    if (deleteResult.isFailure) return Result.fail(deleteResult.error as Error);
    await this.roles.save(role);
    return Result.ok();
  }
}
