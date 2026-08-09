import { Result } from '@/shared/kernel/result';
import { IFundTransactionRepository } from '../../domain/fund-transaction.repository';
import { CreateFundTransactionInput, FundTransactionResult } from '../dto/fund-transaction.dto';
import { FundTransaction } from '../../domain/fund-transaction.entity';
import { toResult } from './list-fund-transactions.use-case';
import { NotificationService } from '@/common/services/notification.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { FundTransactionCreatedEvent } from '@/modules/domain-events/events';

export class CreateFundTransactionUseCase {
  constructor(
    private readonly transactions: IFundTransactionRepository,
    private readonly notifications: NotificationService,
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusImpl,
  ) {}

  async execute(input: CreateFundTransactionInput): Promise<Result<FundTransactionResult>> {
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
    await this.transactions.save(transaction);

    // Apply fund balance effect for approved add/deduct transactions (إضافة/خصم عهدة)
    if ((transaction.type === 'add' || transaction.type === 'deduct') && transaction.status === 'approved') {
      try {
        const sign = transaction.type === 'add' ? 1 : -1;
        await this.prisma.$transaction(async (tx) => {
          const fund = await tx.projectFund.findFirst({
            where: { id: input.fundId, deletedAt: null },
          });
          if (!fund) return;
          const newBalance = new Prisma.Decimal(fund.currentBalance).plus(
            new Prisma.Decimal(transaction.amount).mul(sign),
          );
          await tx.projectFund.update({
            where: { id: fund.id },
            data: { currentBalance: newBalance, lastUpdated: new Date(), updatedAt: new Date() },
          });
        });
      } catch {
        // balance update failure should not block recording the transaction
      }
    }

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
