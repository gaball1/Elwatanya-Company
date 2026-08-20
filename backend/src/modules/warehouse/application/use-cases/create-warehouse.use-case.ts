import { Result } from '@/shared/kernel/result';
import { IWarehouseRepository } from '../../domain/warehouse.repository';
import { CreateWarehouseInput, WarehouseResult } from '../dto/warehouse.dto';
import { Warehouse } from '../../domain/warehouse.entity';
import { toResult } from './list-warehouses.use-case';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';

export class CreateWarehouseUseCase {
  constructor(
    private readonly warehouses: IWarehouseRepository,
    private readonly ownership: OwnershipService,
  ) {}

  async execute(input: CreateWarehouseInput, user?: OwnershipActor, userId?: string): Promise<Result<WarehouseResult>> {
    if (user && input.projectId) await this.ownership.verifyProjectAccess(user, input.projectId);
    const createdBy = userId ?? 'system';

    const existingCode = await this.warehouses.findByCodeIncludingDeleted(input.code);
    if (existingCode) {
      if (existingCode.isDeleted) return Result.fail(new Error(`Warehouse code ${input.code} is marked as deleted. Restore or use a different code.`));
      return Result.fail(new Error(`Warehouse code ${input.code} already exists.`));
    }
    const existingName = await this.warehouses.findByNameIncludingDeleted(input.name);
    if (existingName) {
      if (existingName.isDeleted) return Result.fail(new Error(`Warehouse name ${input.name} is marked as deleted.`));
      return Result.fail(new Error(`Warehouse name ${input.name} already exists.`));
    }
    const warehouseResult = Warehouse.create({
      projectId: input.projectId,
      code: input.code,
      name: input.name,
      location: input.location,
      status: input.status,
    });
    if (warehouseResult.isFailure) return Result.fail(warehouseResult.error as Error);
    const warehouse = warehouseResult.getValue();
    try {
      await this.warehouses.save(warehouse);
    } catch (error: any) {
      if (error?.code === 'P2002' || /unique/i.test(error?.message ?? '')) {
        return Result.fail(new Error('A warehouse with the same name or code already exists.'));
      }
      return Result.fail(error);
    }
    return Result.ok(toResult(warehouse));
  }
}
