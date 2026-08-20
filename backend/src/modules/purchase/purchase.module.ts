import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { FinancialService } from '@/common/services/financial.service';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { NotificationService } from '@/common/services/notification.service';
import { OwnershipService } from '@/common/services/ownership.service';
import { PURCHASE_REPOSITORY } from './domain/purchase.repository';
import { IPurchaseRepository } from './domain/purchase.repository';
import { PrismaPurchaseRepository } from './infrastructure/prisma-purchase.repository';
import { ListPurchasesUseCase } from './application/use-cases/list-purchases.use-case';
import { CreatePurchaseUseCase } from './application/use-cases/create-purchase.use-case';
import { UpdatePurchaseUseCase } from './application/use-cases/update-purchase.use-case';
import { DeletePurchaseUseCase } from './application/use-cases/delete-purchase.use-case';
import { UpdatePurchaseStatusUseCase } from './application/use-cases/update-purchase-status.use-case';
import { PurchaseStockService } from './application/purchase-stock.service';
import { PurchaseController } from './purchase.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PurchaseController],
  providers: [
    FinancialService,
    {
      provide: OwnershipService,
      useFactory: (prisma: PrismaService) => new OwnershipService(prisma),
      inject: [PrismaService],
    },
    { provide: PURCHASE_REPOSITORY, useClass: PrismaPurchaseRepository },
    {
      provide: ListPurchasesUseCase,
      useFactory: (repo: IPurchaseRepository, ownership: OwnershipService) =>
        new ListPurchasesUseCase(repo, ownership),
      inject: [PURCHASE_REPOSITORY, OwnershipService],
    },
    {
      provide: CreatePurchaseUseCase,
      useFactory: (repo: IPurchaseRepository, fs: FinancialService, prisma: PrismaService, eventBus: EventBusImpl, ownership: OwnershipService) =>
        new CreatePurchaseUseCase(repo, fs, prisma, eventBus, ownership),
      inject: [PURCHASE_REPOSITORY, FinancialService, PrismaService, EventBusImpl, OwnershipService],
    },
    {
      provide: UpdatePurchaseUseCase,
      useFactory: (repo: IPurchaseRepository, fs: FinancialService, prisma: PrismaService, ownership: OwnershipService) =>
        new UpdatePurchaseUseCase(repo, fs, prisma, ownership),
      inject: [PURCHASE_REPOSITORY, FinancialService, PrismaService, OwnershipService],
    },
    {
      provide: DeletePurchaseUseCase,
      useFactory: (repo: IPurchaseRepository, fs: FinancialService, prisma: PrismaService, ownership: OwnershipService) =>
        new DeletePurchaseUseCase(repo, fs, prisma, ownership),
      inject: [PURCHASE_REPOSITORY, FinancialService, PrismaService, OwnershipService],
    },
    {
      provide: UpdatePurchaseStatusUseCase,
      useFactory: (repo: IPurchaseRepository, fs: FinancialService, prisma: PrismaService, notifications: NotificationService, stockService: PurchaseStockService, ownership: OwnershipService) =>
        new UpdatePurchaseStatusUseCase(repo, fs, prisma, notifications, stockService, ownership),
      inject: [PURCHASE_REPOSITORY, FinancialService, PrismaService, NotificationService, PurchaseStockService, OwnershipService],
    },
    PurchaseStockService,
  ],
  exports: [PURCHASE_REPOSITORY, PurchaseStockService],
})
export class PurchaseModule {}
