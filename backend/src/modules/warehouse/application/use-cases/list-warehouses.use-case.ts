import { Result } from '@/shared/kernel/result';
import { Warehouse } from '../../domain/warehouse.entity';
import { WarehouseResult } from '../dto/warehouse.dto';
import { IWarehouseRepository } from '../../domain/warehouse.repository';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';

export function toResult(w: Warehouse): WarehouseResult {
  return {
    id: w.id.toValue(),
    projectId: w.projectId,
    code: w.code,
    name: w.name,
    location: w.location,
    status: w.status,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
  };
}

export class ListWarehousesUseCase {
  constructor(
    private readonly warehouses: IWarehouseRepository,
    private readonly ownership: OwnershipService,
  ) {}

  async execute(projectId?: string, user?: OwnershipActor): Promise<Result<WarehouseResult[]>> {
    const accessible = this.ownership.getAccessibleProjectIds(user);
    if (accessible === null) {
      const list = await this.warehouses.findAll(projectId);
      return Result.ok(list.map(toResult));
    }
    if (accessible.length === 0) return Result.ok([]);
    const target = projectId ? (accessible.includes(projectId) ? [projectId] : []) : accessible;
    const list = await this.warehouses.findAll(target.length === 1 ? target[0] : undefined);
    return Result.ok(list.map(toResult));
  }
}
