import { Result } from '@/shared/kernel/result';
import { IFundTransactionRepository } from '../../domain/fund-transaction.repository';
import { CreateFundTransactionInput, FundTransactionResult } from '../dto/fund-transaction.dto';
import { FundTransaction } from '../../domain/fund-transaction.entity';
import { toResult } from './list-fund-transactions.use-case';
import { NotificationService } from '@/common/services/notification.service';
import { PrismaService } from '@/prisma/prisma.service';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { FundTransactionCreatedEvent } from '@/modules/domain-events/events';
import { applyFundBalanceEffects, balanceEffectsFor } from '../fund-balance.util';

export class CreateFundTransactionUseCase {
  constructor(
    private readonly transactions: IFundTransactionRepository,
    private readonly notifications: NotificationService,
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusImpl,
  ) {}

  async execute(input: CreateFundTransactionInput): Promise<Result<FundTransactionResult>> {
    if (!input.description || !input.description.trim()) {
      return Result.fail(new Error('وصف (سبب) المعاملة المالية مطلوب'));
    }

    const result = FundTransaction.create({
      fundId: input.fundId,
      type: input.type,
      amount: input.amount,
      category: input.category,
      description: input.description,
      date: input.date,
      status: input.status,
      referenceId: input.referenceId,
      notes: input.notes,
      createdBy: input.createdBy,
    });

    if (result.isFailure) return Result.fail(result.error as Error);

    const transaction = result.getValue();

    const fund = await this.prisma.projectFund.findUnique({
      where: { id: input.fundId },
    });
    if (!fund) return Result.fail(new Error('العهدة غير موجودة'));

    if (transaction.type === 'deduct') {
      if (transaction.category === 'purchase' || transaction.category === 'miscellaneous') {
        if (Number(fund.pettyCashBalance) < transaction.amount) {
          return Result.fail(new Error('رصيد عهدة الموقع غير كافٍ'));
        }
      } else {
        if (Number(fund.currentBalance) < transaction.amount) {
          return Result.fail(new Error('رصيد الخزنة غير كافٍ'));
        }
      }
    } else if (transaction.type === 'transfer') {
      if (Number(fund.currentBalance) < transaction.amount) {
        return Result.fail(new Error('رصيد الخزنة غير كافٍ للتحويل'));
      }
    }

    // Persist the transaction and apply its fund balance effect atomically so a failed
    // balance update can never leave the ledger out of sync with the transaction row.
    await this.prisma.$transaction(async (tx) => {
      await this.transactions.save(transaction, tx);
      await applyFundBalanceEffects(
        tx,
        transaction.fundId,
        balanceEffectsFor(transaction.type, transaction.category, transaction.status as any, transaction.amount),
      );
    });

    try {
      const fund = await this.prisma.projectFund.findUnique({
        where: { id: input.fundId },
        select: { projectId: true },
      });
      if (fund) {
        await this.notifications.createForProjectMembers(fund.projectId, {
          title: 'معاملة عهدة جديدة',
          titleEn: 'Fund Transaction Created',
          message: `${input.type}: ${input.amount} - ${input.description ?? ''}`,
          messageEn: `${input.type}: ${input.amount} - ${input.description ?? ''}`,
          type: input.type === 'deduct' || input.type === 'request' ? 'warning' : 'success',
          entityType: 'fund_transaction',
          entityId: transaction.id.toValue(),
          link: `/projects/${fund.projectId}/treasury`,
          createdBy: input.createdBy,
        });

        await this.eventBus.publish(
          new FundTransactionCreatedEvent(
            transaction.id.toValue(),
            'fund_transaction',
            {
              id: transaction.id.toValue(),
              fundId: input.fundId,
              projectId: fund.projectId,
              type: input.type,
              amount: input.amount,
              description: input.description ?? '',
              status: input.status ?? 'pending',
              createdBy: input.createdBy,
            },
          ),
        );
      } else {
        await this.eventBus.publish(
          new FundTransactionCreatedEvent(
            transaction.id.toValue(),
            'fund_transaction',
            {
              id: transaction.id.toValue(),
              fundId: input.fundId,
              projectId: '',
              type: input.type,
              amount: input.amount,
              description: input.description ?? '',
              status: input.status ?? 'pending',
              createdBy: input.createdBy,
            },
          ),
        );
      }
    } catch {
      // notification failure should not block the transaction
    }

    return Result.ok(toResult(transaction));
  }
}
