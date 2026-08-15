import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { InventoryItem } from './inventory-item.entity';

export const INVENTORY_ITEM_REPOSITORY = Symbol('INVENTORY_ITEM_REPOSITORY');

export interface IInventoryItemRepository {
  save(item: InventoryItem): Promise<void>;
  findById(id: UniqueEntityId): Promise<InventoryItem | null>;
  findAll(projectId?: string): Promise<InventoryItem[]>;
  findByCode(code: string): Promise<InventoryItem | null>;
  findByCodeIncludingDeleted(code: string): Promise<InventoryItem | null>;
  findNameConflict(nameNorm: string, excludeId?: string): Promise<InventoryItem | null>;
}