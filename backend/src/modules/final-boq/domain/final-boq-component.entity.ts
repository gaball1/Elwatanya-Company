import { BaseEntity } from '@/shared/kernel/base-entity';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { calcTotal } from './final-boq-rules';

/** Persistence model for a Final BOQ component — mirrors store FinalBoqComponent fields. */
export interface FinalBoqComponentProps {
  finalBoqItemId: UniqueEntityId;
  businessCode: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  sortOrder: number;
  deletedAt: Date | null;
}

export class FinalBoqComponent extends BaseEntity {
  private props: FinalBoqComponentProps;

  private constructor(
    props: FinalBoqComponentProps,
    id?: UniqueEntityId,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get finalBoqItemId(): UniqueEntityId {
    return this.props.finalBoqItemId;
  }

  get businessCode(): string {
    return this.props.businessCode;
  }

  get name(): string {
    return this.props.name;
  }

  get unit(): string {
    return this.props.unit;
  }

  get quantity(): number {
    return this.props.quantity;
  }

  get unitPrice(): number {
    return this.props.unitPrice;
  }

  get totalValue(): number {
    return this.props.totalValue;
  }

  get sortOrder(): number {
    return this.props.sortOrder;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  /** Mirrors analyzeFinalItem / addComponentToFinalItem component creation. */
  public static create(input: {
    finalBoqItemId: UniqueEntityId;
    name: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    sortOrder: number;
    id?: UniqueEntityId;
  }): FinalBoqComponent {
    const id = input.id ?? new UniqueEntityId();
    return new FinalBoqComponent(
      {
        finalBoqItemId: input.finalBoqItemId,
        businessCode: `C-${id.toValue().slice(0, 8)}`,
        name: input.name,
        unit: input.unit,
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        totalValue: calcTotal(input.quantity, input.unitPrice),
        sortOrder: input.sortOrder,
        deletedAt: null,
      },
      id,
    );
  }

  public static reconstitute(
    props: FinalBoqComponentProps,
    id: UniqueEntityId,
    createdAt: Date,
    updatedAt: Date,
  ): FinalBoqComponent {
    return new FinalBoqComponent(props, id, createdAt, updatedAt);
  }

  /** Mirrors updateComponentPrice / updateComponentOnly */
  public updateUnitPrice(unitPrice: number): void {
    this.props.unitPrice = unitPrice;
    this.props.totalValue = calcTotal(this.props.quantity, unitPrice);
  }

  /** Mirrors updateComponentQuantity */
  public updateQuantity(quantity: number): void {
    this.props.quantity = quantity;
    this.props.totalValue = calcTotal(quantity, this.props.unitPrice);
  }

  /** Used by syncFinalFromAnalytical / updateFinalItemQuantity ratio scaling */
  public applyScaledQuantity(quantity: number): void {
    this.props.quantity = quantity;
    this.props.totalValue = quantity * this.props.unitPrice;
  }

  public softDelete(): void {
    this.props.deletedAt = new Date();
  }
}
