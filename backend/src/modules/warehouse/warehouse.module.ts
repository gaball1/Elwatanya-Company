import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { WAREHOUSE_REPOSITORY } from './domain/warehouse.repository';
import { IWarehouseRepository } from './domain/warehouse.repository';
import { PrismaWarehouseRepository } from './infrastructure/prisma-warehouse.repository';
import { ListWarehousesUseCase } from './application/use-cases/list-warehouses.use-case';
import { CreateWarehouseUseCase } from './application/use-cases/create-warehouse.use-case';
import { UpdateWarehouseUseCase } from './application/use-cases/update-warehouse.use-case';
import { DeleteWarehouseUseCase } from './application/use-cases/delete-warehouse.use-case';
import { WarehouseController } from './warehouse.controller';

@Module({
  imports: [PrismaModule],
  controllers: [WarehouseController],
  providers: [
    { provide: WAREHOUSE_REPOSITORY, useClass: PrismaWarehouseRepository },
    {
      provide: ListWarehousesUseCase,
      useFactory: (repo: IWarehouseRepository) => new ListWarehousesUseCase(repo),
      inject: [WAREHOUSE_REPOSITORY],
    },
    {
      provide: CreateWarehouseUseCase,
      useFactory: (repo: IWarehouseRepository) => new CreateWarehouseUseCase(repo),
      inject: [WAREHOUSE_REPOSITORY],
    },
    {
      provide: UpdateWarehouseUseCase,
      useFactory: (repo: IWarehouseRepository) => new UpdateWarehouseUseCase(repo),
      inject: [WAREHOUSE_REPOSITORY],
    },
    {
      provide: DeleteWarehouseUseCase,
      useFactory: (repo: IWarehouseRepository) => new DeleteWarehouseUseCase(repo),
      inject: [WAREHOUSE_REPOSITORY],
    },
  ],
  exports: [WAREHOUSE_REPOSITORY],
})
export class WarehouseModule {}
