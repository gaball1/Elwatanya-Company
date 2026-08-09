import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IWarehouseRepository } from '../../domain/warehouse.repository';
import { UpdateWarehouseInput, WarehouseResult } from '../dto/warehouse.dto';
import { toResult } from './list-warehouses.use-case';

export class UpdateWarehouseUseCase {
  constructor(private readonly warehouses: IWarehouseRepository) {}

  async execute(input: UpdateWarehouseInput): Promise<Result<WarehouseResult>> {
    const warehouse = await this.warehouses.findById(new UniqueEntityId(input.id));
    if (!warehouse) return Result.fail(new Error('Warehouse not found'));

    const updateResult = warehouse.update({
      code: input.code,
      name: input.name,
      location: input.location,
      status: input.status,
    });

    if (updateResult.isFailure) return Result.fail(updateResult.error as Error);

    await this.warehouses.save(warehouse);
    return Result.ok(toResult(warehouse));
  }
}
