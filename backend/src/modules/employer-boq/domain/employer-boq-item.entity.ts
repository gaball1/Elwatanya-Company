import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { Result } from '@/shared/kernel/result';
import { Guard } from '@/shared/kernel/guard';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export interface EmployerBoqItemProps {
  buildingId: UniqueEntityId;
  itemCode: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
}

export class EmployerBoqItem extends AggregateRoot {
  private props: EmployerBoqItemProps;

  private constructor(props: EmployerBoqItemProps, id?: UniqueEntityId, createdAt?: Date, updatedAt?: Date) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get buildingId(): UniqueEntityId {
    return this.props.buildingId;
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

  get unitPrice(): number {
    return this.props.unitPrice;
  }

  get totalValue(): number {
    return this.props.totalValue;
  }

  public static create(input: {
    buildingId: UniqueEntityId;
    itemCode: string;
    description: string;
    unit: string;
    quantity: number;
    unitPrice: number;
  }): Result<EmployerBoqItem> {
    const validation = EmployerBoqItem.validateFields(input);
    if (validation.isFailure) {
      return Result.fail(validation.error as Error);
    }

    const values = validation.getValue();
    return Result.ok(
      new EmployerBoqItem({
        buildingId: input.buildingId,
        itemCode: values.itemCode,
        description: values.description,
        unit: values.unit,
        quantity: values.quantity,
        unitPrice: values.unitPrice,
        totalValue: EmployerBoqItem.calculateTotalValue(values.quantity, values.unitPrice),
      }),
    );
  }

  public static reconstitute(
    props: EmployerBoqItemProps,
    id: UniqueEntityId,
    createdAt: Date,
    updatedAt: Date,
  ): EmployerBoqItem {
    return new EmployerBoqItem(props, id, createdAt, updatedAt);
  }

  public update(input: {
    description?: string;
    unit?: string;
    quantity?: number;
    unitPrice?: number;
  }): Result<void> {
    const validation = EmployerBoqItem.validateFields({
      itemCode: this.props.itemCode,
      description: input.description ?? this.props.description,
      unit: input.unit ?? this.props.unit,
      quantity: input.quantity ?? this.props.quantity,
      unitPrice: input.unitPrice ?? this.props.unitPrice,
    });
    if (validation.isFailure) {
      return Result.fail(validation.error as Error);
    }

    const values = validation.getValue();
    this.props.description = values.description;
    this.props.unit = values.unit;
    this.props.quantity = values.quantity;
    this.props.unitPrice = values.unitPrice;
    this.props.totalValue = EmployerBoqItem.calculateTotalValue(values.quantity, values.unitPrice);
    return Result.ok();
  }

  public static calculateTotalValue(quantity: number, unitPrice: number): number {
    return Math.round(quantity * unitPrice * 100) / 100;
  }

  private static validateFields(input: {
    itemCode: string;
    description: string;
    unit: string;
    quantity: number;
    unitPrice: number;
  }): Result<{
    itemCode: string;
    description: string;
    unit: string;
    quantity: number;
    unitPrice: number;
  }> {
    const codeGuard = Guard.againstNullOrUndefined(input.itemCode, 'itemCode');
    if (codeGuard.isFailure) {
      return Result.fail(codeGuard.error as Error);
    }

    const trimmedCode = input.itemCode.trim();
    if (trimmedCode.length === 0) {
      return Result.fail(new Error('Item code cannot be empty'));
    }

    const descriptionGuard = Guard.againstNullOrUndefined(input.description, 'description');
    if (descriptionGuard.isFailure) {
      return Result.fail(descriptionGuard.error as Error);
    }

    const trimmedDescription = input.description.trim();
    if (trimmedDescription.length === 0) {
      return Result.fail(new Error('Description cannot be empty'));
    }

    const unitGuard = Guard.againstNullOrUndefined(input.unit, 'unit');
    if (unitGuard.isFailure) {
      return Result.fail(unitGuard.error as Error);
    }

    const trimmedUnit = input.unit.trim();
    if (trimmedUnit.length === 0) {
      return Result.fail(new Error('Unit cannot be empty'));
    }

    if (!Number.isFinite(input.quantity) || input.quantity < 0) {
      return Result.fail(new Error('Quantity must be a non-negative number'));
    }

    if (!Number.isFinite(input.unitPrice) || input.unitPrice < 0) {
      return Result.fail(new Error('Unit price must be a non-negative number'));
    }

    return Result.ok({
      itemCode: trimmedCode,
      description: trimmedDescription,
      unit: trimmedUnit,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
    });
  }
}
