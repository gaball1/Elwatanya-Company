import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IInventoryItemRepository } from '../../domain/inventory-item.repository';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';

export class DeleteInventoryItemUseCase {
  constructor(
    private readonly items: IInventoryItemRepository,
    private readonly ownership: OwnershipService,
  ) {}

  async execute(id: string, user: OwnershipActor | undefined): Promise<Result<void>> {
    const item = await this.items.findById(new UniqueEntityId(id));
    if (!item) return Result.fail(new Error('Inventory item not found'));

    if (item.projectId) await this.ownership.verifyProjectAccess(user, item.projectId);

    const deleteResult = item.softDelete();
    if (deleteResult.isFailure) return Result.fail(deleteResult.error as Error);

    await this.items.save(item);
    return Result.ok();
  }
}
