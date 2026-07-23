import { BaseEntity } from '@/shared/kernel/base-entity';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { calcTotal } from './contractor-boq-rules';

export interface ContractorBoqItemProps {
  contractorBoqId: UniqueEntityId;
  itemCode: string;
  description: string;
  unit: string;
  quantity: number;
  assignedQuantity: number;
  unitPrice: number;
  totalValue: number;
  finalItemId: string | null;
  componentId: UniqueEntityId | null;
  deletedAt: Date | null;
}

export class ContractorBoqItem extends BaseEntity {
  private props: ContractorBoqItemProps;

  private constructor(
    props: ContractorBoqItemProps,
    id?: UniqueEntityId,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get contractorBoqId(): UniqueEntityId {
    return this.props.contractorBoqId;
  }

  get itemCode(): string {
    return this.props.itemCode;
  }

  get description(): string {
    return this.props.description;
  }

  get unit(): string {
    return this.props.unit;
  }

  get quantity(): number {
    return this.props.quantity;
  }

  get assignedQuantity(): number {
    return this.props.assignedQuantity;
  }

  get unitPrice(): number {
    return this.props.unitPrice;
  }

  get totalValue(): number {
    return this.props.totalValue;
  }

  get finalItemId(): string | null {
    return this.props.finalItemId;
  }

  get componentId(): UniqueEntityId | null {
    return this.props.componentId;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  public static create(input: {
    contractorBoqId: UniqueEntityId;
    itemCode: string;
    description: string;
    unit: string;
    quantity: number;
    assignedQuantity: number;
    unitPrice: number;
    finalItemId?: string | null;
    componentId?: UniqueEntityId | null;
  }): ContractorBoqItem {
    return new ContractorBoqItem({
      contractorBoqId: input.contractorBoqId,
      itemCode: input.itemCode,
      description: input.description,
      unit: input.unit,
      quantity: input.quantity,
      assignedQuantity: input.assignedQuantity,
      unitPrice: input.unitPrice,
      totalValue: calcTotal(input.assignedQuantity, input.unitPrice),
      finalItemId: input.finalItemId ?? input.itemCode,
      componentId: input.componentId ?? null,
      deletedAt: null,
    });
  }

  public static reconstitute(
    props: ContractorBoqItemProps,
    id: UniqueEntityId,
    createdAt: Date,
    updatedAt: Date,
  ): ContractorBoqItem {
    return new ContractorBoqItem(props, id, createdAt, updatedAt);
  }

  public applyQuantities(quantity: number, assignedQuantity: number, unitPrice: number): void {
    this.props.quantity = quantity;
    this.props.assignedQuantity = assignedQuantity;
    this.props.unitPrice = unitPrice;
    this.props.totalValue = calcTotal(assignedQuantity, unitPrice);
  }

  public softDelete(): void {
    this.props.deletedAt = new Date();
  }
}
