import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { NotificationService } from '@/common/services/notification.service';
import { PrismaService } from '@/prisma/prisma.service';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { OwnershipService } from '@/common/services/ownership.service';
import { FUND_TRANSACTION_REPOSITORY } from './domain/fund-transaction.repository';
import { IFundTransactionRepository } from './domain/fund-transaction.repository';
import { PrismaFundTransactionRepository } from './infrastructure/prisma-fund-transaction.repository';
import { ListFundTransactionsUseCase } from './application/use-cases/list-fund-transactions.use-case';
import { CreateFundTransactionUseCase } from './application/use-cases/create-fund-transaction.use-case';
import { UpdateFundTransactionUseCase } from './application/use-cases/update-fund-transaction.use-case';
import { DeleteFundTransactionUseCase } from './application/use-cases/delete-fund-transaction.use-case';
import { FundTransactionController } from './fund-transaction.controller';

@Module({
  imports: [PrismaModule],
  controllers: [FundTransactionController],
  providers: [
    {
      provide: OwnershipService,
      useFactory: (prisma: PrismaService) => new OwnershipService(prisma),
      inject: [PrismaService],
    },
    { provide: FUND_TRANSACTION_REPOSITORY, useClass: PrismaFundTransactionRepository },
    {
      provide: ListFundTransactionsUseCase,
      useFactory: (repo: IFundTransactionRepository) => new ListFundTransactionsUseCase(repo),
      inject: [FUND_TRANSACTION_REPOSITORY],
    },
    {
      provide: CreateFundTransactionUseCase,
      useFactory: (repo: IFundTransactionRepository, notifications: NotificationService, prisma: PrismaService, eventBus: EventBusImpl, ownership: OwnershipService) =>
        new CreateFundTransactionUseCase(repo, notifications, prisma, eventBus, ownership),
      inject: [FUND_TRANSACTION_REPOSITORY, NotificationService, PrismaService, EventBusImpl, OwnershipService],
    },
    {
      provide: UpdateFundTransactionUseCase,
      useFactory: (repo: IFundTransactionRepository, prisma: PrismaService, ownership: OwnershipService) =>
        new UpdateFundTransactionUseCase(repo, prisma, ownership),
      inject: [FUND_TRANSACTION_REPOSITORY, PrismaService, OwnershipService],
    },
    {
      provide: DeleteFundTransactionUseCase,
      useFactory: (repo: IFundTransactionRepository, prisma: PrismaService, ownership: OwnershipService) =>
        new DeleteFundTransactionUseCase(repo, prisma, ownership),
      inject: [FUND_TRANSACTION_REPOSITORY, PrismaService, OwnershipService],
    },
  ],
  exports: [FUND_TRANSACTION_REPOSITORY],
})
export class FundTransactionModule {}
