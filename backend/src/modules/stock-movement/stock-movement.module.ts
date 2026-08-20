import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { OwnershipService } from '@/common/services/ownership.service';
import { STOCK_MOVEMENT_REPOSITORY } from './domain/stock-movement.repository';
import { IStockMovementRepository } from './domain/stock-movement.repository';
import { PrismaStockMovementRepository } from './infrastructure/prisma-stock-movement.repository';
import { ListStockMovementsUseCase } from './application/use-cases/list-stock-movements.use-case';
import { CreateStockMovementUseCase } from './application/use-cases/create-stock-movement.use-case';
import { UpdateStockMovementUseCase } from './application/use-cases/update-stock-movement.use-case';
import { DeleteStockMovementUseCase } from './application/use-cases/delete-stock-movement.use-case';
import { StockMovementController } from './stock-movement.controller';
import { StockEffectService } from './application/stock-effect.service';

@Module({
  imports: [PrismaModule],
  controllers: [StockMovementController],
  providers: [
    {
      provide: OwnershipService,
      useFactory: (prisma: PrismaService) => new OwnershipService(prisma),
      inject: [PrismaService],
    },
    { provide: STOCK_MOVEMENT_REPOSITORY, useClass: PrismaStockMovementRepository },
    StockEffectService,
    { provide: ListStockMovementsUseCase, useFactory: (repo: IStockMovementRepository) => new ListStockMovementsUseCase(repo), inject: [STOCK_MOVEMENT_REPOSITORY] },
    { provide: CreateStockMovementUseCase, useFactory: (repo: IStockMovementRepository, prisma: PrismaService, eventBus: EventBusImpl, stockEffect: StockEffectService, ownership: OwnershipService) => new CreateStockMovementUseCase(repo, prisma, eventBus, stockEffect, ownership), inject: [STOCK_MOVEMENT_REPOSITORY, PrismaService, EventBusImpl, StockEffectService, OwnershipService] },
    { provide: UpdateStockMovementUseCase, useFactory: (repo: IStockMovementRepository, prisma: PrismaService, eventBus: EventBusImpl, stockEffect: StockEffectService, ownership: OwnershipService) => new UpdateStockMovementUseCase(repo, prisma, eventBus, stockEffect, ownership), inject: [STOCK_MOVEMENT_REPOSITORY, PrismaService, EventBusImpl, StockEffectService, OwnershipService] },
    { provide: DeleteStockMovementUseCase, useFactory: (repo: IStockMovementRepository, prisma: PrismaService, eventBus: EventBusImpl, stockEffect: StockEffectService, ownership: OwnershipService) => new DeleteStockMovementUseCase(repo, prisma, eventBus, stockEffect, ownership), inject: [STOCK_MOVEMENT_REPOSITORY, PrismaService, EventBusImpl, StockEffectService, OwnershipService] },
  ],
  exports: [STOCK_MOVEMENT_REPOSITORY],
})
export class StockMovementModule {}
