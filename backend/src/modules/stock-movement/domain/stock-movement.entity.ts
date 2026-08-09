import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { Result } from '@/shared/kernel/result';
import { Guard } from '@/shared/kernel/guard';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export type StockMovementType = 'ISSUE' | 'RECEIVE' | 'TRANSFER';

export interface StockMovementProps {
  itemId: string;
  type: StockMovementType;
  quantity: number;
  date: Date;
  reference: string;
  notes: string;
  createdBy: string;
  issuedTo: string;
  supplier: string;
  fromWarehouse: string;
  toWarehouse: string;
  deletedAt: Date | null;
}

export class StockMovement extends AggregateRoot {
  private props: StockMovementProps;

  private constructor(
    props: StockMovementProps,
    id?: UniqueEntityId,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get itemId(): string { return this.props.itemId; }
  get type(): StockMovementType { return this.props.type; }
  get quantity(): number { return this.props.quantity; }
  get date(): Date { return this.props.date; }
  get reference(): string { return this.props.reference; }
  get notes(): string { return this.props.notes; }
  get createdBy(): string { return this.props.createdBy; }
  get issuedTo(): string { return this.props.issuedTo; }
  get supplier(): string { return this.props.supplier; }
  get fromWarehouse(): string { return this.props.fromWarehouse; }
  get toWarehouse(): string { return this.props.toWarehouse; }
  get deletedAt(): Date | null { return this.props.deletedAt; }
  get isDeleted(): boolean { return this.props.deletedAt !== null; }

  public static create(input: {
    itemId: string;
    type: StockMovementType;
    quantity: number;
    date?: Date;
    reference?: string;
    notes?: string;
    createdBy?: string;
    issuedTo?: string;
    supplier?: string;
    fromWarehouse?: string;
    toWarehouse?: string;
  }): Result<StockMovement> {
    const guard = Guard.againstNullOrUndefined(input.itemId, 'itemId');
    if (guard.isFailure) return Result.fail(guard.error as Error);

    const typeGuard = Guard.againstNullOrUndefined(input.type, 'type');
    if (typeGuard.isFailure) return Result.fail(typeGuard.error as Error);

    const qtyGuard = Guard.againstNullOrUndefined(input.quantity, 'quantity');
    if (qtyGuard.isFailure) return Result.fail(qtyGuard.error as Error);

    if (input.quantity <= 0) return Result.fail(new Error('Quantity must be positive'));

    return Result.ok(
      new StockMovement({
        itemId: input.itemId,
        type: input.type,
        quantity: input.quantity,
        date: input.date ?? new Date(),
        reference: input.reference ?? '',
        notes: input.notes ?? '',
        createdBy: input.createdBy ?? '',
        issuedTo: input.issuedTo ?? '',
        supplier: input.supplier ?? '',
        fromWarehouse: input.fromWarehouse ?? '',
        toWarehouse: input.toWarehouse ?? '',
        deletedAt: null,
      }),
    );
  }

  public static reconstitute(
    props: StockMovementProps,
    id: UniqueEntityId,
    createdAt: Date,
    updatedAt: Date,
  ): StockMovement {
    return new StockMovement(props, id, createdAt, updatedAt);
  }

  public update(fields: {
    itemId?: string;
    type?: StockMovementType;
    quantity?: number;
    date?: Date;
    reference?: string;
    notes?: string;
    createdBy?: string;
    issuedTo?: string;
    supplier?: string;
    fromWarehouse?: string;
    toWarehouse?: string;
  }): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Cannot update a deleted stock movement'));

    if (fields.itemId !== undefined) this.props.itemId = fields.itemId;
    if (fields.type !== undefined) this.props.type = fields.type;
    if (fields.quantity !== undefined) {
      if (fields.quantity <= 0) return Result.fail(new Error('Quantity must be positive'));
      this.props.quantity = fields.quantity;
    }
    if (fields.date !== undefined) this.props.date = fields.date;
    if (fields.reference !== undefined) this.props.reference = fields.reference;
    if (fields.notes !== undefined) this.props.notes = fields.notes;
    if (fields.createdBy !== undefined) this.props.createdBy = fields.createdBy;
    if (fields.issuedTo !== undefined) this.props.issuedTo = fields.issuedTo;
    if (fields.supplier !== undefined) this.props.supplier = fields.supplier;
    if (fields.fromWarehouse !== undefined) this.props.fromWarehouse = fields.fromWarehouse;
    if (fields.toWarehouse !== undefined) this.props.toWarehouse = fields.toWarehouse;

    return Result.ok();
  }

  public softDelete(): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Stock movement is already deleted'));
    this.props.deletedAt = new Date();
    return Result.ok();
  }
}
