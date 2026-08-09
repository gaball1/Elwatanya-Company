import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IWarehouseRepository } from '../../domain/warehouse.repository';

export class DeleteWarehouseUseCase {
  constructor(private readonly warehouses: IWarehouseRepository) {}

  async execute(id: string): Promise<Result<void>> {
    const warehouse = await this.warehouses.findById(new UniqueEntityId(id));
    if (!warehouse) return Result.fail(new Error('Warehouse not found'));

    const deleteResult = warehouse.softDelete();
    if (deleteResult.isFailure) return Result.fail(deleteResult.error as Error);

    await this.warehouses.save(warehouse);
    return Result.ok();
  }
}
