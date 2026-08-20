import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { PrismaService } from '@/prisma/prisma.service';
import { OwnershipService } from '@/common/services/ownership.service';
import { WAREHOUSE_REPOSITORY } from './domain/warehouse.repository';
import { IWarehouseRepository } from './domain/warehouse.repository';
import { PrismaWarehouseRepository } from './infrastructure/prisma-warehouse.repository';
import { ListWarehousesUseCase } from './application/use-cases/list-warehouses.use-case';
import { CreateWarehouseUseCase } from './application/use-cases/create-warehouse.use-case';
import { UpdateWarehouseUseCase } from './application/use-cases/update-warehouse.use-case';
import { DeleteWarehouseUseCase } from './application/use-cases/delete-warehouse.use-case';
import { ProjectWarehouseSubscriber } from './application/project-warehouse.subscriber';
import { WarehouseController } from './warehouse.controller';

@Module({
  imports: [PrismaModule],
  controllers: [WarehouseController],
  providers: [
    {
      provide: OwnershipService,
      useFactory: (prisma: PrismaService) => new OwnershipService(prisma),
      inject: [PrismaService],
    },
    { provide: WAREHOUSE_REPOSITORY, useClass: PrismaWarehouseRepository },
    {
      provide: ListWarehousesUseCase,
      useFactory: (repo: IWarehouseRepository, ownership: OwnershipService) => new ListWarehousesUseCase(repo, ownership),
      inject: [WAREHOUSE_REPOSITORY, OwnershipService],
    },
    {
      provide: CreateWarehouseUseCase,
      useFactory: (repo: IWarehouseRepository, ownership: OwnershipService) => new CreateWarehouseUseCase(repo, ownership),
      inject: [WAREHOUSE_REPOSITORY, OwnershipService],
    },
    {
      provide: UpdateWarehouseUseCase,
      useFactory: (repo: IWarehouseRepository, ownership: OwnershipService) => new UpdateWarehouseUseCase(repo, ownership),
      inject: [WAREHOUSE_REPOSITORY, OwnershipService],
    },
    {
      provide: DeleteWarehouseUseCase,
      useFactory: (repo: IWarehouseRepository, ownership: OwnershipService) => new DeleteWarehouseUseCase(repo, ownership),
      inject: [WAREHOUSE_REPOSITORY, OwnershipService],
    },
    {
      provide: ProjectWarehouseSubscriber,
      useFactory: (eventBus: EventBusImpl, prisma: PrismaService, createWarehouse: CreateWarehouseUseCase) =>
        new ProjectWarehouseSubscriber(eventBus, prisma, createWarehouse),
      inject: [EventBusImpl, PrismaService, CreateWarehouseUseCase],
    },
  ],
  exports: [WAREHOUSE_REPOSITORY],
})
export class WarehouseModule {}
