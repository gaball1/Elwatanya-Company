import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IWarehouseRepository } from '../../domain/warehouse.repository';
import { UpdateWarehouseInput, WarehouseResult } from '../dto/warehouse.dto';
import { toResult } from './list-warehouses.use-case';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';

export class UpdateWarehouseUseCase {
  constructor(
    private readonly warehouses: IWarehouseRepository,
    private readonly ownership: OwnershipService,
  ) {}

  async execute(input: UpdateWarehouseInput, user: OwnershipActor | undefined, userId?: string): Promise<Result<WarehouseResult>> {
    const warehouse = await this.warehouses.findById(new UniqueEntityId(input.id));
    if (!warehouse) return Result.fail(new Error('Warehouse not found'));

    if (warehouse.projectId) await this.ownership.verifyProjectAccess(user, warehouse.projectId);

    if (input.code !== undefined && input.code.trim() !== warehouse.code) {
      const codeClash = await this.warehouses.findByCodeIncludingDeleted(input.code.trim());
      if (codeClash && codeClash.id.toValue() !== input.id) {
        return Result.fail(new Error(`Warehouse code "${input.code.trim()}" already exists. Use a different code.`));
      }
    }

    if (input.name !== undefined && input.name.trim() !== warehouse.name) {
      const nameClash = await this.warehouses.findByNameIncludingDeleted(input.name.trim());
      if (nameClash && nameClash.id.toValue() !== input.id) {
        return Result.fail(new Error(`Warehouse name "${input.name.trim()}" already exists. Use a different name.`));
      }
    }

    const updateResult = warehouse.update({
      projectId: input.projectId,
      code: input.code,
      name: input.name,
      location: input.location,
      status: input.status,
    });

    if (updateResult.isFailure) return Result.fail(updateResult.error as Error);

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
