import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import {
  calcExtractItem,
  computeExtractTotals,
  ExtractDeduction,
  ExtractItemCalculated,
  ExtractItemInput,
  ExtractStatus,
} from './extract-rules';

export interface ExtractItemProps extends ExtractItemCalculated {
  contractorBoqItemId: string;
}

export interface ExtractProps {
  contractorBoqId: UniqueEntityId;
  sequenceNumber: number;
  status: ExtractStatus;
  runningNumber: number | null;
  label: string | null;
  insurancePercent: number;
  extractDate: Date;
  previousPaid: number;
  totalWorkValue: number;
  totalDeductions: number;
  netPayable: number;
  deletedAt: Date | null;
}

export class Extract extends AggregateRoot {
  private props: ExtractProps;
  private _items: ExtractItemProps[] = [];
  private _manualDeductions: ExtractDeduction[] = [];

  private constructor(
    props: ExtractProps,
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

  get sequenceNumber(): number {
    return this.props.sequenceNumber;
  }

  get status(): ExtractStatus {
    return this.props.status;
  }

  get runningNumber(): number | null {
    return this.props.runningNumber;
  }

  get label(): string | null {
    return this.props.label;
  }

  get insurancePercent(): number {
    return this.props.insurancePercent;
  }

  get extractDate(): Date {
    return this.props.extractDate;
  }

  get previousPaid(): number {
    return this.props.previousPaid;
  }

  get totalWorkValue(): number {
    return this.props.totalWorkValue;
  }

  get totalDeductions(): number {
    return this.props.totalDeductions;
  }

  get netPayable(): number {
    return this.props.netPayable;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  get items(): ExtractItemProps[] {
    return [...this._items];
  }

  get manualDeductions(): ExtractDeduction[] {
    return [...this._manualDeductions];
  }

  public static create(input: {
    contractorBoqId: UniqueEntityId;
    status: ExtractStatus;
    runningNumber?: number | null;
    label?: string | null;
    insurancePercent: number;
    extractDate: Date;
    previousPaid: number;
    items: (ExtractItemInput & { contractorBoqItemId: string })[];
    manualDeductions?: ExtractDeduction[];
  }): Extract {
    const calculated = input.items.map((i) => ({
      contractorBoqItemId: i.contractorBoqItemId,
      ...calcExtractItem(i),
    }));
    const totals = computeExtractTotals(
      calculated,
      input.insurancePercent,
      input.previousPaid,
      input.manualDeductions ?? [],
    );

    const extract = new Extract({
      contractorBoqId: input.contractorBoqId,
      sequenceNumber: input.runningNumber ?? 1,
      status: input.status,
      runningNumber: input.runningNumber ?? null,
      label: input.label ?? null,
      insurancePercent: input.insurancePercent,
      extractDate: input.extractDate,
      previousPaid: input.previousPaid,
      totalWorkValue: totals.totalWorkValue,
      totalDeductions: totals.totalDeductions,
      netPayable: totals.netPayable,
      deletedAt: null,
    });
    extract._items = calculated;
    extract._manualDeductions = input.manualDeductions ?? [];
    return extract;
  }

  public static reconstitute(
    props: ExtractProps,
    id: UniqueEntityId,
    createdAt: Date,
    updatedAt: Date,
    items: ExtractItemProps[],
    manualDeductions: ExtractDeduction[],
  ): Extract {
    const extract = new Extract(props, id, createdAt, updatedAt);
    extract._items = items;
    extract._manualDeductions = manualDeductions;
    return extract;
  }

  public replaceContent(input: {
    status?: ExtractStatus;
    label?: string | null;
    insurancePercent?: number;
    extractDate?: Date;
    previousPaid?: number;
    items?: (ExtractItemInput & { contractorBoqItemId: string })[];
    manualDeductions?: ExtractDeduction[];
  }): void {
    if (input.status !== undefined) this.props.status = input.status;
    if (input.label !== undefined) this.props.label = input.label;
    if (input.insurancePercent !== undefined) {
      this.props.insurancePercent = input.insurancePercent;
    }
    if (input.extractDate !== undefined) this.props.extractDate = input.extractDate;
    if (input.previousPaid !== undefined) this.props.previousPaid = input.previousPaid;
    if (input.manualDeductions !== undefined) {
      this._manualDeductions = input.manualDeductions;
    }
    if (input.items !== undefined) {
      this._items = input.items.map((i) => ({
        contractorBoqItemId: i.contractorBoqItemId,
        ...calcExtractItem(i),
      }));
    }

    const totals = computeExtractTotals(
      this._items,
      this.props.insurancePercent,
      this.props.previousPaid,
      this._manualDeductions,
    );
    this.props.totalWorkValue = totals.totalWorkValue;
    this.props.totalDeductions = totals.totalDeductions;
    this.props.netPayable = totals.netPayable;
  }

  public softDelete(): void {
    this.props.deletedAt = new Date();
  }

  public allDeductions(): ExtractDeduction[] {
    return computeExtractTotals(
      this._items,
      this.props.insurancePercent,
      this.props.previousPaid,
      this._manualDeductions,
    ).deductions;
  }
}
