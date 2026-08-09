import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export type PaymentStatus = 'pending' | 'approved';

export interface PaymentProps {
  statementId: UniqueEntityId | null;
  buildingId: UniqueEntityId | null;
  contractorId: UniqueEntityId | null;
  amount: number;
  paidAt: Date;
  notes: string | null;
  status: PaymentStatus;
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

  get status(): PaymentStatus {
    return this.props.status;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  // Intentional: payments use their own domain-specific approve flow (markApproved +
  // PaymentApprovedEvent). Do NOT wire payments into the generic approval engine.
  public markApproved(): void {
    this.props.status = 'approved';
  }

  public update(input: { amount?: number; paidAt?: Date; notes?: string | null }): void {
    if (input.amount !== undefined) {
      this.props.amount = input.amount;
    }
    if (input.paidAt !== undefined) {
      this.props.paidAt = input.paidAt;
    }
    if (input.notes !== undefined) {
      this.props.notes = input.notes;
    }
  }

  public markDeleted(): void {
    this.props.deletedAt = new Date();
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
      status: 'pending',
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
