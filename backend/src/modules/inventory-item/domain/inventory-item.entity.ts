import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { Result } from '@/shared/kernel/result';
import { Guard } from '@/shared/kernel/guard';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { normalizeKey } from '@/shared/utils/string-normalizer';

export interface InventoryItemProps {
  code: string;
  name: string;
  nameNorm: string;
  description: string;
  categoryId: string;
  warehouseId: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  price: number;
  avgCost: number;
  status: string;
  deletedAt: Date | null;
}

export class InventoryItem extends AggregateRoot {
  private props: InventoryItemProps;

  private constructor(
    props: InventoryItemProps,
    id?: UniqueEntityId,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get code(): string { return this.props.code; }
  get name(): string { return this.props.name; }
  get nameNorm(): string { return this.props.nameNorm; }
  get description(): string { return this.props.description; }
  get categoryId(): string { return this.props.categoryId; }
  get warehouseId(): string { return this.props.warehouseId; }
  get unit(): string { return this.props.unit; }
  get quantity(): number { return this.props.quantity; }
  get minQuantity(): number { return this.props.minQuantity; }
  get price(): number { return this.props.price; }
  get avgCost(): number { return this.props.avgCost; }
  get status(): string { return this.props.status; }
  get deletedAt(): Date | null { return this.props.deletedAt; }
  get isDeleted(): boolean { return this.props.deletedAt !== null; }

  public static create(input: {
    code: string;
    name: string;
    description?: string;
    categoryId?: string;
    warehouseId?: string;
    unit?: string;
    quantity?: number;
    minQuantity?: number;
    price?: number;
    status?: string;
  }): Result<InventoryItem> {
    const guard = Guard.againstNullOrUndefined(input.code, 'code');
    if (guard.isFailure) return Result.fail(guard.error as Error);
    if (input.code.trim().length === 0) return Result.fail(new Error('Item code cannot be empty'));

    const nameGuard = Guard.againstNullOrUndefined(input.name, 'name');
    if (nameGuard.isFailure) return Result.fail(nameGuard.error as Error);
    if (input.name.trim().length === 0) return Result.fail(new Error('Item name cannot be empty'));

    return Result.ok(
      new InventoryItem({
        code: input.code.trim(),
        name: input.name.trim(),
        nameNorm: normalizeKey(input.name),
        description: input.description ?? '',
        categoryId: input.categoryId ?? '',
        warehouseId: input.warehouseId ?? '',
        unit: input.unit ?? '',
        quantity: input.quantity ?? 0,
        minQuantity: input.minQuantity ?? 0,
        price: input.price ?? 0,
        avgCost: input.price ?? 0,
        status: input.status ?? 'active',
        deletedAt: null,
      }),
    );
  }

  public static reconstitute(
    props: InventoryItemProps,
    id: UniqueEntityId,
    createdAt: Date,
    updatedAt: Date,
  ): InventoryItem {
    return new InventoryItem(props, id, createdAt, updatedAt);
  }

  public update(fields: {
    code?: string;
    name?: string;
    description?: string;
    categoryId?: string;
    warehouseId?: string;
    unit?: string;
    quantity?: number;
    minQuantity?: number;
    price?: number;
    avgCost?: number;
    status?: string;
  }): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Cannot update a deleted inventory item'));

    if (fields.code !== undefined) {
      if (fields.code.trim().length === 0) return Result.fail(new Error('Item code cannot be empty'));
      this.props.code = fields.code.trim();
    }
    if (fields.name !== undefined) {
      if (fields.name.trim().length === 0) return Result.fail(new Error('Item name cannot be empty'));
      this.props.name = fields.name.trim();
      this.props.nameNorm = normalizeKey(fields.name);
    }
    if (fields.description !== undefined) this.props.description = fields.description;
    if (fields.categoryId !== undefined) this.props.categoryId = fields.categoryId;
    if (fields.warehouseId !== undefined) this.props.warehouseId = fields.warehouseId;
    if (fields.unit !== undefined) this.props.unit = fields.unit;
    if (fields.quantity !== undefined) this.props.quantity = fields.quantity;
    if (fields.minQuantity !== undefined) this.props.minQuantity = fields.minQuantity;
    if (fields.price !== undefined) this.props.price = fields.price;
    if (fields.avgCost !== undefined) this.props.avgCost = fields.avgCost;
    if (fields.status !== undefined) this.props.status = fields.status;

    return Result.ok();
  }

  public receiveStock(quantity: number, unitCost: number): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Cannot receive stock on a deleted item'));
    if (quantity <= 0) return Result.fail(new Error('Received quantity must be positive'));
    this.props.quantity = Math.round((this.props.quantity + quantity) * 100) / 100;
    this.props.avgCost = Math.round(unitCost * 100) / 100;
    this.props.price = Math.round(unitCost * 100) / 100;
    return Result.ok();
  }

  public withdrawStock(quantity: number): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Cannot withdraw stock on a deleted item'));
    if (quantity <= 0) return Result.fail(new Error('Withdrawn quantity must be positive'));
    const remaining = Math.round((this.props.quantity - quantity) * 100) / 100;
    if (remaining < 0) return Result.fail(new Error('Insufficient stock to reverse'));
    this.props.quantity = remaining;
    return Result.ok();
  }

  public softDelete(): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Inventory item is already deleted'));
    this.props.deletedAt = new Date();
    return Result.ok();
  }
}
