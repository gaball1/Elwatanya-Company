import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IInventoryItemRepository } from '../../domain/inventory-item.repository';

export class DeleteInventoryItemUseCase {
  constructor(private readonly items: IInventoryItemRepository) {}

  async execute(id: string): Promise<Result<void>> {
    const item = await this.items.findById(new UniqueEntityId(id));
    if (!item) return Result.fail(new Error('Inventory item not found'));

    const deleteResult = item.softDelete();
    if (deleteResult.isFailure) return Result.fail(deleteResult.error as Error);

    await this.items.save(item);
    return Result.ok();
  }
}
