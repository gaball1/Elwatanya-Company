import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { Result } from '@/shared/kernel/result';
import { Guard } from '@/shared/kernel/guard';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export type PurchaseStatus = 'pending' | 'approved' | 'received' | 'cancelled';

export interface PurchaseProps {
  projectId: string;
  buildingId: string | null;
  supplierId: string | null;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  date: Date;
  status: PurchaseStatus;
  notes: string;
  invoiceFile: string | null;
  supplierName: string;
  createdBy: string;
  categoryId: string;
  inventoryItemId: string;
  deletedAt: Date | null;
}

export class Purchase extends AggregateRoot {
  private props: PurchaseProps;

  private constructor(
    props: PurchaseProps,
    id?: UniqueEntityId,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get projectId(): string { return this.props.projectId; }
  get buildingId(): string | null { return this.props.buildingId; }
  get supplierId(): string | null { return this.props.supplierId; }
  get itemName(): string { return this.props.itemName; }
  get quantity(): number { return this.props.quantity; }
  get unit(): string { return this.props.unit; }
  get unitPrice(): number { return this.props.unitPrice; }
  get total(): number { return this.props.total; }
  get date(): Date { return this.props.date; }
  get status(): PurchaseStatus { return this.props.status; }
  get notes(): string { return this.props.notes; }
  get invoiceFile(): string | null { return this.props.invoiceFile; }
  get supplierName(): string { return this.props.supplierName; }
  get createdBy(): string { return this.props.createdBy; }
  get categoryId(): string { return this.props.categoryId; }
  get inventoryItemId(): string { return this.props.inventoryItemId; }
  get deletedAt(): Date | null { return this.props.deletedAt; }
  get isDeleted(): boolean { return this.props.deletedAt !== null; }

  public static create(input: {
    projectId: string;
    buildingId?: string | null;
    supplierId?: string | null;
    itemName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    date: Date;
    notes?: string;
    invoiceFile?: string | null;
    supplierName?: string;
    createdBy: string;
    categoryId?: string;
    inventoryItemId?: string;
  }): Result<Purchase> {
    const guard1 = Guard.againstNullOrUndefined(input.projectId, 'projectId');
    const guard2 = Guard.againstNullOrUndefined(input.itemName, 'itemName');
    const guard3 = Guard.againstNullOrUndefined(input.quantity, 'quantity');
    const guard4 = Guard.againstNullOrUndefined(input.unitPrice, 'unitPrice');
    const guard5 = Guard.againstNullOrUndefined(input.date, 'date');
    const guard6 = Guard.againstNullOrUndefined(input.createdBy, 'createdBy');
    const combined = Guard.combine(guard1, guard2, guard3, guard4, guard5, guard6);
    if (combined.isFailure) return Result.fail(combined.error as Error);

    const trimmedName = input.itemName.trim();
    if (trimmedName.length === 0) return Result.fail(new Error('Item name cannot be empty'));

    if (input.quantity <= 0) return Result.fail(new Error('Quantity must be positive'));
    if (input.unitPrice < 0) return Result.fail(new Error('Unit price cannot be negative'));
    if (!input.unit.trim()) return Result.fail(new Error('Unit cannot be empty'));

    const total = Math.round(input.quantity * input.unitPrice * 100) / 100;

    return Result.ok(
      new Purchase({
        projectId: input.projectId,
        buildingId: input.buildingId ?? null,
        supplierId: input.supplierId ?? null,
        itemName: trimmedName,
        quantity: input.quantity,
        unit: input.unit.trim(),
        unitPrice: input.unitPrice,
        total,
        date: input.date,
        status: 'pending',
        notes: input.notes ?? '',
        invoiceFile: input.invoiceFile ?? null,
        supplierName: input.supplierName ?? '',
        createdBy: input.createdBy,
        categoryId: input.categoryId ?? '',
        inventoryItemId: input.inventoryItemId ?? '',
        deletedAt: null,
      }),
    );
  }

  public static reconstitute(
    props: PurchaseProps,
    id: UniqueEntityId,
    createdAt: Date,
    updatedAt: Date,
  ): Purchase {
    return new Purchase(props, id, createdAt, updatedAt);
  }

  public update(fields: {
    itemName?: string;
    quantity?: number;
    unit?: string;
    unitPrice?: number;
    date?: Date;
    notes?: string;
    invoiceFile?: string | null;
    supplierName?: string;
    buildingId?: string | null;
    supplierId?: string | null;
    categoryId?: string;
    inventoryItemId?: string;
  }): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Cannot update a deleted purchase'));

    if (fields.itemName !== undefined) {
      const trimmed = fields.itemName.trim();
      if (trimmed.length === 0) return Result.fail(new Error('Item name cannot be empty'));
      this.props.itemName = trimmed;
    }
    if (fields.quantity !== undefined) {
      if (fields.quantity <= 0) return Result.fail(new Error('Quantity must be positive'));
      this.props.quantity = fields.quantity;
    }
    if (fields.unit !== undefined) {
      if (!fields.unit.trim()) return Result.fail(new Error('Unit cannot be empty'));
      this.props.unit = fields.unit.trim();
    }
    if (fields.unitPrice !== undefined) {
      if (fields.unitPrice < 0) return Result.fail(new Error('Unit price cannot be negative'));
      this.props.unitPrice = fields.unitPrice;
    }
    if (fields.date !== undefined) this.props.date = fields.date;
    if (fields.notes !== undefined) this.props.notes = fields.notes;
    if (fields.invoiceFile !== undefined) this.props.invoiceFile = fields.invoiceFile;
    if (fields.supplierName !== undefined) this.props.supplierName = fields.supplierName;
    if (fields.buildingId !== undefined) this.props.buildingId = fields.buildingId;
    if (fields.supplierId !== undefined) this.props.supplierId = fields.supplierId;
    if (fields.categoryId !== undefined) this.props.categoryId = fields.categoryId;
    if (fields.inventoryItemId !== undefined) this.props.inventoryItemId = fields.inventoryItemId;

    this.props.total = Math.round(this.props.quantity * this.props.unitPrice * 100) / 100;

    return Result.ok();
  }

  public linkInventoryItem(inventoryItemId: string): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Cannot link a deleted purchase'));
    if (!inventoryItemId.trim()) return Result.fail(new Error('Inventory item id is required'));
    this.props.inventoryItemId = inventoryItemId;
    return Result.ok();
  }

  public approve(): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Cannot approve a deleted purchase'));
    if (this.props.status === 'cancelled') return Result.fail(new Error('Cannot approve a cancelled purchase'));
    this.props.status = 'approved';
    return Result.ok();
  }

  public markReceived(): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Cannot mark a deleted purchase as received'));
    if (this.props.status === 'cancelled') return Result.fail(new Error('Cannot receive a cancelled purchase'));
    this.props.status = 'received';
    return Result.ok();
  }

  public cancel(): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Cannot cancel a deleted purchase'));
    if (this.props.status === 'cancelled') return Result.fail(new Error('Purchase is already cancelled'));
    // A received purchase may be cancelled/reversed; the caller reverses the stock atomically.
    this.props.status = 'cancelled';
    return Result.ok();
  }

  public softDelete(): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Purchase is already deleted'));
    this.props.deletedAt = new Date();
    return Result.ok();
  }
}
