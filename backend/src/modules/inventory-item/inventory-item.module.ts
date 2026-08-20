import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { OwnershipService } from '@/common/services/ownership.service';
import { INVENTORY_ITEM_REPOSITORY } from './domain/inventory-item.repository';
import { IInventoryItemRepository } from './domain/inventory-item.repository';
import { PrismaInventoryItemRepository } from './infrastructure/prisma-inventory-item.repository';
import { ListInventoryItemsUseCase } from './application/use-cases/list-inventory-items.use-case';
import { CreateInventoryItemUseCase } from './application/use-cases/create-inventory-item.use-case';
import { UpdateInventoryItemUseCase } from './application/use-cases/update-inventory-item.use-case';
import { DeleteInventoryItemUseCase } from './application/use-cases/delete-inventory-item.use-case';
import { IncreaseInventoryItemUseCase } from './application/use-cases/increase-inventory-item.use-case';
import { InventoryItemController } from './inventory-item.controller';

@Module({
  imports: [PrismaModule],
  controllers: [InventoryItemController],
  providers: [
    {
      provide: OwnershipService,
      useFactory: (prisma: PrismaService) => new OwnershipService(prisma),
      inject: [PrismaService],
    },
    { provide: INVENTORY_ITEM_REPOSITORY, useClass: PrismaInventoryItemRepository },
    { provide: ListInventoryItemsUseCase, useFactory: (repo: IInventoryItemRepository, prisma: PrismaService, ownership: OwnershipService) => new ListInventoryItemsUseCase(repo, prisma, ownership), inject: [INVENTORY_ITEM_REPOSITORY, PrismaService, OwnershipService] },
    { provide: CreateInventoryItemUseCase, useFactory: (repo: IInventoryItemRepository, prisma: PrismaService, ownership: OwnershipService) => new CreateInventoryItemUseCase(repo, prisma, ownership), inject: [INVENTORY_ITEM_REPOSITORY, PrismaService, OwnershipService] },
    { provide: UpdateInventoryItemUseCase, useFactory: (repo: IInventoryItemRepository, prisma: PrismaService, ownership: OwnershipService) => new UpdateInventoryItemUseCase(repo, prisma, ownership), inject: [INVENTORY_ITEM_REPOSITORY, PrismaService, OwnershipService] },
    { provide: DeleteInventoryItemUseCase, useFactory: (repo: IInventoryItemRepository, ownership: OwnershipService) => new DeleteInventoryItemUseCase(repo, ownership), inject: [INVENTORY_ITEM_REPOSITORY, OwnershipService] },
    { provide: IncreaseInventoryItemUseCase, useFactory: (repo: IInventoryItemRepository, prisma: PrismaService, ownership: OwnershipService) => new IncreaseInventoryItemUseCase(repo, prisma, ownership), inject: [INVENTORY_ITEM_REPOSITORY, PrismaService, OwnershipService] },
  ],
  exports: [INVENTORY_ITEM_REPOSITORY],
})
export class InventoryItemModule {}
