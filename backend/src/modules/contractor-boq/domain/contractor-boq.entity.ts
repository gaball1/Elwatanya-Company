import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { ContractorBoqItem } from './contractor-boq-item.entity';
import { ContractorItemState } from './contractor-boq-rules';

export interface ContractorBoqProps {
  buildingId: UniqueEntityId;
  subcontractorId: UniqueEntityId;
  workType: string | null;
  status: string;
  version: number;
  deletedAt: Date | null;
}

export class ContractorBoq extends AggregateRoot {
  private props: ContractorBoqProps;
  private _items: ContractorBoqItem[] = [];

  private constructor(
    props: ContractorBoqProps,
    id?: UniqueEntityId,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get buildingId(): UniqueEntityId {
    return this.props.buildingId;
  }

  get subcontractorId(): UniqueEntityId {
    return this.props.subcontractorId;
  }

  get workType(): string | null {
    return this.props.workType;
  }

  get status(): string {
    return this.props.status;
  }

  get version(): number {
    return this.props.version;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  get items(): ContractorBoqItem[] {
    return this._items.filter((i) => i.deletedAt === null);
  }

  get allItems(): ContractorBoqItem[] {
    return [...this._items];
  }

  public static create(input: {
    buildingId: UniqueEntityId;
    subcontractorId: UniqueEntityId;
    workType?: string | null;
  }): ContractorBoq {
    return new ContractorBoq({
      buildingId: input.buildingId,
      subcontractorId: input.subcontractorId,
      workType: input.workType ?? null,
      status: 'Draft',
      version: 1,
      deletedAt: null,
    });
  }

  public static reconstitute(
    props: ContractorBoqProps,
    id: UniqueEntityId,
    createdAt: Date,
    updatedAt: Date,
    items: ContractorBoqItem[] = [],
  ): ContractorBoq {
    const aggregate = new ContractorBoq(props, id, createdAt, updatedAt);
    aggregate._items = items;
    return aggregate;
  }

  /** Mirrors setContractorMeta */
  public setMeta(workType: string): void {
    this.props.workType = workType;
  }

  public replaceItemsFromState(states: ContractorItemState[]): void {
    for (const existing of this.items) {
      const keep = states.find(
        (s) =>
          s.itemCode === existing.itemCode &&
          (s.componentId ?? null) === (existing.componentId?.toValue() ?? null),
      );
      if (!keep) {
        existing.softDelete();
      }
    }

    for (const state of states) {
      const existing = this.items.find(
        (i) =>
          i.itemCode === state.itemCode &&
          (i.componentId?.toValue() ?? null) === (state.componentId ?? null),
      );
      if (existing) {
        existing.applyQuantities(state.quantity, state.assignedQuantity, state.unitPrice);
      } else {
        this._items.push(
          ContractorBoqItem.create({
            contractorBoqId: this.id,
            itemCode: state.itemCode,
            description: state.description,
            unit: state.unit,
            quantity: state.quantity,
            assignedQuantity: state.assignedQuantity,
            unitPrice: state.unitPrice,
            finalItemId: state.finalItemId ?? state.itemCode,
            componentId: state.componentId ? new UniqueEntityId(state.componentId) : null,
          }),
        );
      }
    }
  }

  public removeItem(itemCode: string, componentId?: string): void {
    const item = this.items.find(
      (i) =>
        i.itemCode === itemCode &&
        (i.componentId?.toValue() ?? undefined) === componentId,
    );
    if (item) {
      item.softDelete();
    }
  }

  public toItemStates(): ContractorItemState[] {
    return this.items.map((i) => ({
      itemCode: i.itemCode,
      description: i.description,
      unit: i.unit,
      quantity: i.quantity,
      assignedQuantity: i.assignedQuantity,
      unitPrice: i.unitPrice,
      totalValue: i.totalValue,
      componentId: i.componentId?.toValue() ?? null,
      finalItemId: i.finalItemId,
    }));
  }
}
