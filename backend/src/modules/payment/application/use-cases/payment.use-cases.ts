import { Injectable } from '@nestjs/common';
import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { Prisma } from '@prisma/client';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import {
  BuildingApplicationError,
  BuildingErrorCode,
} from '@/modules/building/application/errors/building-application.error';
import { OwnershipActor, OwnershipService } from '@/common/services/ownership.service';
import { FinancialService } from '@/common/services/financial.service';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { PaymentCreatedEvent, PaymentApprovedEvent } from '@/modules/domain-events/events';
import { PrismaService } from '@/prisma/prisma.service';
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
  status: string;
}

/** Mirrors the عهدة guard used by purchases/miscellaneous: fund must exist and cover the amount. */
async function ensureProjectFund(tx: Prisma.TransactionClient, projectId: string, amount: number): Promise<void> {
  const fund = await tx.projectFund.findFirst({
    where: { projectId, deletedAt: null },
  });
  if (!fund) {
    throw new Error('لا توجد عهدة لهذا المشروع. برجاء إنشاء عهدة أولاً');
  }
  if (new Prisma.Decimal(amount).gt(fund.currentBalance)) {
    throw new Error(
      `رصيد العهدة غير كافٍ. المتاح: ${Number(fund.currentBalance).toLocaleString('en-EG')}، المطلوب: ${amount.toLocaleString('en-EG')}`,
    );
  }
}

/** Mirrors getPayments */
export class ListPaymentsUseCase {
  constructor(
    private readonly payments: IPaymentRepository,
    private readonly buildings: IBuildingRepository,
    private readonly ownership: OwnershipService,
  ) {}

  async execute(buildingId: string, contractorId: string, user?: OwnershipActor): Promise<Result<PaymentResult[]>> {
    await this.ownership.verifyBuildingAccess(user, buildingId);
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
        status: p.status,
      })),
    );
  }
}

/** Mirrors getPayment */
export class GetPaymentUseCase {
  constructor(
    private readonly payments: IPaymentRepository,
    private readonly buildings: IBuildingRepository,
    private readonly ownership: OwnershipService,
  ) {}

  async execute(
    buildingId: string,
    contractorId: string,
    paymentId: string,
    user?: OwnershipActor,
  ): Promise<Result<PaymentResult>> {
    await this.ownership.verifyBuildingAccess(user, buildingId);
    const building = await this.buildings.findById(new UniqueEntityId(buildingId));
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const payment = await this.payments.findById(new UniqueEntityId(paymentId));
    if (!payment) {
      return Result.fail(new Error('Payment not found'));
    }

    return Result.ok({
      id: payment.id.toValue(),
      buildingId: payment.buildingId?.toValue() ?? null,
      contractorId: payment.contractorId?.toValue() ?? null,
      extractId: payment.statementId?.toValue() ?? null,
      amount: payment.amount,
      date: payment.paidAt.toISOString(),
      notes: payment.notes,
      status: payment.status,
    });
  }
}

/** Mirrors addPayment */
export class AddPaymentUseCase {
  constructor(
    private readonly payments: IPaymentRepository,
    private readonly buildings: IBuildingRepository,
    private readonly ownership: OwnershipService,
    private readonly financialService: FinancialService,
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusImpl,
  ) {}

  async execute(input: {
    buildingId: string;
    contractorId: string;
    amount: number;
    date: string;
    extractId?: string;
    notes?: string;
  }, user?: OwnershipActor): Promise<Result<PaymentResult>> {
    await this.ownership.verifyBuildingAccess(user, input.buildingId);

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

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.payments.save(payment, tx);
        const meta = JSON.stringify({ buildingId: input.buildingId, contractorId: input.contractorId });
        await ensureProjectFund(tx, building.projectId.toValue(), input.amount);
        await this.financialService.recordExpense({
          projectId: building.projectId.toValue(),
          amount: input.amount,
          category: 'extract',
          referenceId: payment.id.toValue(),
          description: `دفعة مقاول: ${input.notes || ''}`,
          notes: meta,
          createdBy: 'system',
          date: new Date(input.date),
        }, tx);
      });
    } catch (error: any) {
      return Result.fail(error);
    }

    await this.eventBus.publish(
      new PaymentCreatedEvent(
        payment.id.toValue(),
        'payment',
        {
          id: payment.id.toValue(),
          extractId: input.extractId,
          contractorId: input.contractorId,
          amount: payment.amount,
          projectId: building.projectId.toValue(),
          createdBy: undefined,
        },
      ),
    );

    return Result.ok({
      id: payment.id.toValue(),
      buildingId: input.buildingId,
      contractorId: input.contractorId,
      extractId: input.extractId ?? null,
      amount: payment.amount,
      date: payment.paidAt.toISOString(),
      notes: payment.notes,
      status: payment.status,
    });
  }
}

/** Mirrors updatePayment */
export class UpdatePaymentUseCase {
  constructor(
    private readonly payments: IPaymentRepository,
    private readonly buildings: IBuildingRepository,
    private readonly ownership: OwnershipService,
    private readonly financialService: FinancialService,
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusImpl,
  ) {}

  async execute(
    input: {
      buildingId: string;
      contractorId: string;
      paymentId: string;
      amount?: number;
      date?: string;
      notes?: string;
      status?: 'pending' | 'approved';
      approvedBy?: string;
    },
    user?: OwnershipActor,
  ): Promise<Result<PaymentResult>> {
    await this.ownership.verifyBuildingAccess(user, input.buildingId);

    const building = await this.buildings.findById(new UniqueEntityId(input.buildingId));
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const payment = await this.payments.findById(new UniqueEntityId(input.paymentId));
    if (!payment) {
      return Result.fail(new Error('Payment not found'));
    }

    if (input.amount !== undefined && (!Number.isFinite(input.amount) || input.amount <= 0)) {
      return Result.fail(new Error('Payment amount must be a positive number'));
    }

    const wasApproved = payment.status === 'approved';
    const originalAmount = payment.amount;
    const newAmount = input.amount ?? originalAmount;
    const amountDelta = newAmount - originalAmount;

    payment.update({
      amount: input.amount,
      paidAt: input.date !== undefined ? new Date(input.date) : undefined,
      notes: input.notes !== undefined ? input.notes : undefined,
    });

    const becameApproved = !wasApproved && input.status === 'approved';
    if (becameApproved) {
      payment.markApproved();
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.payments.update(payment, tx);
        if (amountDelta > 0) {
          await ensureProjectFund(tx, building.projectId.toValue(), amountDelta);
          await this.financialService.recordExpense({
            projectId: building.projectId.toValue(),
            amount: amountDelta,
            category: 'extract',
            referenceId: payment.id.toValue(),
            description: `زيادة دفعة مقاول: ${input.notes ?? payment.notes ?? ''}`,
            createdBy: 'system',
            date: new Date(),
          }, tx);
        } else if (amountDelta < 0) {
          await this.financialService.reverseExpense({
            projectId: building.projectId.toValue(),
            amount: -amountDelta,
            category: 'extract',
            referenceId: payment.id.toValue(),
            description: `تخفيض دفعة مقاول: ${input.notes ?? payment.notes ?? ''}`,
            createdBy: 'system',
            date: new Date(),
          }, tx);
        }
      });
    } catch (error: any) {
      return Result.fail(error);
    }

    if (becameApproved) {
      await this.eventBus.publish(
        new PaymentApprovedEvent(
          payment.id.toValue(),
          'payment',
          {
            id: payment.id.toValue(),
            amount: payment.amount,
            approvedBy: input.approvedBy ?? 'system',
          },
        ),
      );
    }

    return Result.ok({
      id: payment.id.toValue(),
      buildingId: input.buildingId,
      contractorId: input.contractorId,
      extractId: payment.statementId?.toValue() ?? null,
      amount: payment.amount,
      date: payment.paidAt.toISOString(),
      notes: payment.notes,
      status: payment.status,
    });
  }
}

/** Mirrors deletePayment */
export class DeletePaymentUseCase {
  constructor(
    private readonly payments: IPaymentRepository,
    private readonly buildings: IBuildingRepository,
    private readonly ownership: OwnershipService,
    private readonly financialService: FinancialService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    input: {
      buildingId: string;
      contractorId: string;
      paymentId: string;
    },
    user?: OwnershipActor,
  ): Promise<Result<void>> {
    await this.ownership.verifyBuildingAccess(user, input.buildingId);

    const building = await this.buildings.findById(new UniqueEntityId(input.buildingId));
    if (!building) {
      return Result.fail(
        new BuildingApplicationError(BuildingErrorCode.NOT_FOUND, 'Building not found'),
      );
    }

    const payment = await this.payments.findById(new UniqueEntityId(input.paymentId));
    if (!payment) {
      return Result.fail(new Error('Payment not found'));
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.payments.softDelete(new UniqueEntityId(input.paymentId), tx);
        await this.financialService.reverseExpense({
          projectId: building.projectId.toValue(),
          amount: payment.amount,
          category: 'extract',
          referenceId: payment.id.toValue(),
          description: `حذف دفعة مقاول: ${payment.notes ?? ''}`,
          createdBy: 'system',
          date: new Date(),
        }, tx);
      });
    } catch (error: any) {
      return Result.fail(error);
    }

    return Result.ok();
  }
}
