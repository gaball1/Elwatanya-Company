import { BaseEntity } from '@/shared/kernel/base-entity';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { FinalBoqComponent } from './final-boq-component.entity';
import { calcTotal, FinalItemStatus } from './final-boq-rules';

export interface FinalBoqItemProps {
  finalBoqId: UniqueEntityId;
  businessCode: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  itemStatus: FinalItemStatus;
  isAnalyzed: boolean;
  sortOrder: number;
  deletedAt: Date | null;
}

/**
 * Final BOQ line item — persistence carrier whose mutations mirror boqStore.
 * Status / remainingQuantity derivation lives in final-boq-rules.ts.
 */
export class FinalBoqItem extends BaseEntity {
  private props: FinalBoqItemProps;
  private _components: FinalBoqComponent[] = [];

  private constructor(
    props: FinalBoqItemProps,
    id?: UniqueEntityId,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get finalBoqId(): UniqueEntityId {
    return this.props.finalBoqId;
  }

  get businessCode(): string {
    return this.props.businessCode;
  }

  get itemCode(): string {
    return this.props.businessCode;
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

  get unitPrice(): number {
    return this.props.unitPrice;
  }

  get totalValue(): number {
    return this.props.totalValue;
  }

  get itemStatus(): FinalItemStatus {
    return this.props.itemStatus;
  }

  get isAnalyzed(): boolean {
    return this.props.isAnalyzed;
  }

  get sortOrder(): number {
    return this.props.sortOrder;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  get components(): FinalBoqComponent[] {
    return this._components.filter((c) => c.deletedAt === null);
  }

  get allComponents(): FinalBoqComponent[] {
    return [...this._components];
  }

  public static create(input: {
    finalBoqId: UniqueEntityId;
    itemCode: string;
    description: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    sortOrder: number;
  }): FinalBoqItem {
    return new FinalBoqItem({
      finalBoqId: input.finalBoqId,
      businessCode: input.itemCode,
      description: input.description,
      unit: input.unit,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      totalValue: calcTotal(input.quantity, input.unitPrice),
      itemStatus: 'pending',
      isAnalyzed: false,
      sortOrder: input.sortOrder,
      deletedAt: null,
    });
  }

  public static reconstitute(
    props: FinalBoqItemProps,
    id: UniqueEntityId,
    createdAt: Date,
    updatedAt: Date,
    components: FinalBoqComponent[] = [],
  ): FinalBoqItem {
    const item = new FinalBoqItem(props, id, createdAt, updatedAt);
    item._components = components;
    return item;
  }

  /** Mirrors importFinalFromEmployer / new analytical item branch */
  public static fromSourceItem(input: {
    finalBoqId: UniqueEntityId;
    itemCode: string;
    description: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalValue: number;
    sortOrder: number;
  }): FinalBoqItem {
    return new FinalBoqItem({
      finalBoqId: input.finalBoqId,
      businessCode: input.itemCode,
      description: input.description,
      unit: input.unit,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      totalValue: input.totalValue,
      itemStatus: 'pending',
      isAnalyzed: false,
      sortOrder: input.sortOrder,
      deletedAt: null,
    });
  }

  /** Mirrors updateFinalItem patch fields */
  public applyPatch(patch: {
    description?: string;
    quantity?: number;
    unitPrice?: number;
    unit?: string;
    status?: FinalItemStatus;
  }): void {
    if (patch.description !== undefined) this.props.description = patch.description;
    if (patch.unit !== undefined) this.props.unit = patch.unit;
    if (patch.quantity !== undefined) this.props.quantity = patch.quantity;
    if (patch.unitPrice !== undefined) this.props.unitPrice = patch.unitPrice;
    if (patch.quantity !== undefined || patch.unitPrice !== undefined) {
      this.props.totalValue = calcTotal(this.props.quantity, this.props.unitPrice);
    }
    if (patch.status !== undefined) this.props.itemStatus = patch.status;
  }

  public setState(input: {
    description: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalValue: number;
    itemStatus: FinalItemStatus;
    isAnalyzed: boolean;
  }): void {
    this.props.description = input.description;
    this.props.unit = input.unit;
    this.props.quantity = input.quantity;
    this.props.unitPrice = input.unitPrice;
    this.props.totalValue = input.totalValue;
    this.props.itemStatus = input.itemStatus;
    this.props.isAnalyzed = input.isAnalyzed;
  }

  /** Mirrors analyzeFinalItem — replaces components, sets analyzed. */
  public analyze(components: { name: string; unit: string; unitPrice: number }[]): void {
    for (const existing of this.components) {
      existing.softDelete();
    }

    const created = components.map((c, index) =>
      FinalBoqComponent.create({
        finalBoqItemId: this.id,
        name: c.name,
        unit: c.unit,
        quantity: this.props.quantity,
        unitPrice: c.unitPrice,
        sortOrder: index,
      }),
    );

    this._components = [...this._components.filter((c) => c.deletedAt !== null), ...created];
    this.props.isAnalyzed = true;
    this.props.itemStatus = 'analyzed';
  }

  /** Mirrors addComponentToFinalItem — does not change status, only isAnalyzed. */
  public addComponent(input: {
    name: string;
    unit: string;
    unitPrice: number;
  }): FinalBoqComponent {
    const component = FinalBoqComponent.create({
      finalBoqItemId: this.id,
      name: input.name,
      unit: input.unit,
      quantity: this.props.quantity,
      unitPrice: input.unitPrice,
      sortOrder: this.components.length,
    });
    this._components.push(component);
    this.props.isAnalyzed = true;
    return component;
  }

  /** Mirrors removeComponentFromFinalItem — does not auto-reset isAnalyzed/status. */
  public removeComponent(componentId: UniqueEntityId): boolean {
    const component = this.components.find((c) => c.id.equals(componentId));
    if (!component) return false;
    component.softDelete();
    return true;
  }

  public findComponent(componentId: UniqueEntityId): FinalBoqComponent | null {
    return this.components.find((c) => c.id.equals(componentId)) ?? null;
  }

  /**
   * Mirrors updateComponentQuantity guard: newQuantity > item.quantity → blocked.
   */
  public updateComponentQuantity(componentId: UniqueEntityId, newQuantity: number): boolean {
    if (newQuantity > this.props.quantity) {
      return false;
    }
    const component = this.findComponent(componentId);
    if (!component) return false;
    component.updateQuantity(newQuantity);
    return true;
  }

  public updateComponentPrice(componentId: UniqueEntityId, newPrice: number): boolean {
    const component = this.findComponent(componentId);
    if (!component) return false;
    component.updateUnitPrice(newPrice);
    return true;
  }

  public replaceComponents(components: FinalBoqComponent[]): void {
    for (const existing of this.components) {
      existing.softDelete();
    }
    this._components = [...this._components.filter((c) => c.deletedAt !== null), ...components];
  }

  public softDelete(): void {
    this.props.deletedAt = new Date();
    for (const component of this.components) {
      component.softDelete();
    }
  }
}
