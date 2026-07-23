import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { FinalBoqItem } from './final-boq-item.entity';

/**
 * Persistence container for Final BOQ items of a building.
 * Frontend stores items in Map<buildingId, FinalBoqItem[]> — one root per building
 * is only an infrastructure mapping onto the Prisma FinalBoq table.
 */
export interface FinalBoqProps {
  buildingId: UniqueEntityId;
  projectId: UniqueEntityId;
  businessCode: string;
  status: string;
  version: number;
  deletedAt: Date | null;
}

export class FinalBoq extends AggregateRoot {
  private props: FinalBoqProps;
  private _items: FinalBoqItem[] = [];

  private constructor(
    props: FinalBoqProps,
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

  get projectId(): UniqueEntityId {
    return this.props.projectId;
  }

  get businessCode(): string {
    return this.props.businessCode;
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

  get items(): FinalBoqItem[] {
    return this._items.filter((i) => i.deletedAt === null);
  }

  get allItems(): FinalBoqItem[] {
    return [...this._items];
  }

  public static createForBuilding(input: {
    buildingId: UniqueEntityId;
    projectId: UniqueEntityId;
  }): FinalBoq {
    return new FinalBoq({
      buildingId: input.buildingId,
      projectId: input.projectId,
      businessCode: `FINAL-${input.buildingId.toValue()}`,
      status: 'pending',
      version: 1,
      deletedAt: null,
    });
  }

  public static reconstitute(
    props: FinalBoqProps,
    id: UniqueEntityId,
    createdAt: Date,
    updatedAt: Date,
    items: FinalBoqItem[] = [],
  ): FinalBoq {
    const aggregate = new FinalBoq(props, id, createdAt, updatedAt);
    aggregate._items = items;
    return aggregate;
  }

  public findItemByCode(itemCode: string): FinalBoqItem | null {
    return this.items.find((item) => item.itemCode === itemCode) ?? null;
  }

  public addItem(item: FinalBoqItem): void {
    this._items.push(item);
  }

  public removeItemByCode(itemCode: string): boolean {
    const item = this.findItemByCode(itemCode);
    if (!item) return false;
    item.softDelete();
    return true;
  }

  /**
   * Mirrors syncFinalFromAnalytical set: next list becomes the full active set.
   * Items missing from next are soft-deleted (frontend replaces the array).
   */
  public replaceActiveItems(nextItems: FinalBoqItem[]): void {
    const nextCodes = new Set(nextItems.map((i) => i.itemCode));

    for (const existing of this.items) {
      if (!nextCodes.has(existing.itemCode)) {
        existing.softDelete();
      }
    }

    for (const item of nextItems) {
      if (!this.findItemByCode(item.itemCode)) {
        this._items.push(item);
      }
    }
  }
}
