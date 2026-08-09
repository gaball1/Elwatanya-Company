import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { INVENTORY_ITEM_REPOSITORY } from './domain/inventory-item.repository';
import { IInventoryItemRepository } from './domain/inventory-item.repository';
import { PrismaInventoryItemRepository } from './infrastructure/prisma-inventory-item.repository';
import { ListInventoryItemsUseCase } from './application/use-cases/list-inventory-items.use-case';
import { CreateInventoryItemUseCase } from './application/use-cases/create-inventory-item.use-case';
import { UpdateInventoryItemUseCase } from './application/use-cases/update-inventory-item.use-case';
import { DeleteInventoryItemUseCase } from './application/use-cases/delete-inventory-item.use-case';
import { InventoryItemController } from './inventory-item.controller';

@Module({
  imports: [PrismaModule],
  controllers: [InventoryItemController],
  providers: [
    { provide: INVENTORY_ITEM_REPOSITORY, useClass: PrismaInventoryItemRepository },
    { provide: ListInventoryItemsUseCase, useFactory: (repo: IInventoryItemRepository) => new ListInventoryItemsUseCase(repo), inject: [INVENTORY_ITEM_REPOSITORY] },
    { provide: CreateInventoryItemUseCase, useFactory: (repo: IInventoryItemRepository, prisma: PrismaService) => new CreateInventoryItemUseCase(repo, prisma), inject: [INVENTORY_ITEM_REPOSITORY, PrismaService] },
    { provide: UpdateInventoryItemUseCase, useFactory: (repo: IInventoryItemRepository, prisma: PrismaService) => new UpdateInventoryItemUseCase(repo, prisma), inject: [INVENTORY_ITEM_REPOSITORY, PrismaService] },
    { provide: DeleteInventoryItemUseCase, useFactory: (repo: IInventoryItemRepository) => new DeleteInventoryItemUseCase(repo), inject: [INVENTORY_ITEM_REPOSITORY] },
  ],
  exports: [INVENTORY_ITEM_REPOSITORY],
})
export class InventoryItemModule {}
