import { Result } from '@/shared/kernel/result';
import { IWarehouseRepository } from '../../domain/warehouse.repository';
import { CreateWarehouseInput, WarehouseResult } from '../dto/warehouse.dto';
import { Warehouse } from '../../domain/warehouse.entity';
import { toResult } from './list-warehouses.use-case';

export class CreateWarehouseUseCase {
  constructor(private readonly warehouses: IWarehouseRepository) {}

  async execute(input: CreateWarehouseInput): Promise<Result<WarehouseResult>> {
    const result = Warehouse.create({
      code: input.code,
      name: input.name,
      location: input.location,
      status: input.status,
    });

    if (result.isFailure) return Result.fail(result.error as Error);

    const warehouse = result.getValue();
    await this.warehouses.save(warehouse);
    return Result.ok(toResult(warehouse));
  }
}
