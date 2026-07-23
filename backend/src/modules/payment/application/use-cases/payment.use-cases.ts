import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import {
  BuildingApplicationError,
  BuildingErrorCode,
} from '@/modules/building/application/errors/building-application.error';
import { Payment } from '../../domain/payment.entity';
import { IPaymentRepository } from '../../domain/payment.repository';

export interface PaymentResult {
  id: string;
  buildingId: string | null;
  contractorId: string | null;
  extractId: string | null;
  amount: number;
  date: string;
  notes: string | null;
}

/** Mirrors getPayments */
export class ListPaymentsUseCase {
  constructor(
    private readonly payments: IPaymentRepository,
    private readonly buildings: IBuildingRepository,
  ) {}

  async execute(buildingId: string, contractorId: string): Promise<Result<PaymentResult[]>> {
    const building = await this.buildings.findById(new UniqueEntityId(buildingId));
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const list = await this.payments.findByBuildingAndContractor(
      new UniqueEntityId(buildingId),
      new UniqueEntityId(contractorId),
    );

    return Result.ok(
      list.map((p) => ({
        id: p.id.toValue(),
        buildingId: p.buildingId?.toValue() ?? null,
        contractorId: p.contractorId?.toValue() ?? null,
        extractId: p.statementId?.toValue() ?? null,
        amount: p.amount,
        date: p.paidAt.toISOString(),
        notes: p.notes,
      })),
    );
  }
}

/** Mirrors addPayment */
export class AddPaymentUseCase {
  constructor(
    private readonly payments: IPaymentRepository,
    private readonly buildings: IBuildingRepository,
  ) {}

  async execute(input: {
    buildingId: string;
    contractorId: string;
    amount: number;
    date: string;
    extractId?: string;
    notes?: string;
  }): Promise<Result<PaymentResult>> {
    const building = await this.buildings.findById(new UniqueEntityId(input.buildingId));
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return Result.fail(new Error('Payment amount must be a positive number'));
    }

    const payment = Payment.create({
      buildingId: input.buildingId,
      contractorId: input.contractorId,
      statementId: input.extractId,
      amount: input.amount,
      paidAt: new Date(input.date),
      notes: input.notes,
    });

    await this.payments.save(payment);

    return Result.ok({
      id: payment.id.toValue(),
      buildingId: input.buildingId,
      contractorId: input.contractorId,
      extractId: input.extractId ?? null,
      amount: payment.amount,
      date: payment.paidAt.toISOString(),
      notes: payment.notes,
    });
  }
}
