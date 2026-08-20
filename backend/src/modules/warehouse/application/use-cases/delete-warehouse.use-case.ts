import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IWarehouseRepository } from '../../domain/warehouse.repository';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';

export class DeleteWarehouseUseCase {
  constructor(
    private readonly warehouses: IWarehouseRepository,
    private readonly ownership: OwnershipService,
  ) {}

  async execute(id: string, user: OwnershipActor | undefined): Promise<Result<void>> {
    const warehouse = await this.warehouses.findById(new UniqueEntityId(id));
    if (!warehouse) return Result.fail(new Error('Warehouse not found'));

    if (warehouse.projectId) await this.ownership.verifyProjectAccess(user, warehouse.projectId);

    const deleteResult = warehouse.softDelete();
    if (deleteResult.isFailure) return Result.fail(deleteResult.error as Error);

    await this.warehouses.save(warehouse);
    return Result.ok();
  }
}
