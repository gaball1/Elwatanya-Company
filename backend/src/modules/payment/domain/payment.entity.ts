import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export interface PaymentProps {
  statementId: UniqueEntityId | null;
  buildingId: UniqueEntityId | null;
  contractorId: UniqueEntityId | null;
  amount: number;
  paidAt: Date;
  notes: string | null;
  deletedAt: Date | null;
}

/** Mirrors frontend ContractorPayment */
export class Payment extends AggregateRoot {
  private props: PaymentProps;

  private constructor(
    props: PaymentProps,
    id?: UniqueEntityId,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get statementId(): UniqueEntityId | null {
    return this.props.statementId;
  }

  get buildingId(): UniqueEntityId | null {
    return this.props.buildingId;
  }

  get contractorId(): UniqueEntityId | null {
    return this.props.contractorId;
  }

  get amount(): number {
    return this.props.amount;
  }

  get paidAt(): Date {
    return this.props.paidAt;
  }

  get notes(): string | null {
    return this.props.notes;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  public static create(input: {
    amount: number;
    paidAt: Date;
    buildingId?: string;
    contractorId?: string;
    statementId?: string;
    notes?: string;
  }): Payment {
    return new Payment({
      statementId: input.statementId ? new UniqueEntityId(input.statementId) : null,
      buildingId: input.buildingId ? new UniqueEntityId(input.buildingId) : null,
      contractorId: input.contractorId ? new UniqueEntityId(input.contractorId) : null,
      amount: input.amount,
      paidAt: input.paidAt,
      notes: input.notes ?? null,
      deletedAt: null,
    });
  }

  public static reconstitute(
    props: PaymentProps,
    id: UniqueEntityId,
    createdAt: Date,
    updatedAt: Date,
  ): Payment {
    return new Payment(props, id, createdAt, updatedAt);
  }
}
