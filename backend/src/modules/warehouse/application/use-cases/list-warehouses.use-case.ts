import { Result } from '@/shared/kernel/result';
import { Warehouse } from '../../domain/warehouse.entity';
import { WarehouseResult } from '../dto/warehouse.dto';
import { IWarehouseRepository } from '../../domain/warehouse.repository';

export function toResult(w: Warehouse): WarehouseResult {
  return {
    id: w.id.toValue(),
    code: w.code,
    name: w.name,
    location: w.location,
    status: w.status,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
  };
}

export class ListWarehousesUseCase {
  constructor(private readonly warehouses: IWarehouseRepository) {}

  async execute(): Promise<Result<WarehouseResult[]>> {
    const list = await this.warehouses.findAll();
    return Result.ok(list.map(toResult));
  }
}
