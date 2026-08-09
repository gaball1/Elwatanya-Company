import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { SUPPLIER_REPOSITORY } from './domain/supplier.repository';
import { ISupplierRepository } from './domain/supplier.repository';
import { PrismaSupplierRepository } from './infrastructure/prisma-supplier.repository';
import { GetSupplierUseCase } from './application/use-cases/get-supplier.use-case';
import { ListSuppliersUseCase } from './application/use-cases/list-suppliers.use-case';
import { CreateSupplierUseCase } from './application/use-cases/create-supplier.use-case';
import { UpdateSupplierUseCase } from './application/use-cases/update-supplier.use-case';
import { DeleteSupplierUseCase } from './application/use-cases/delete-supplier.use-case';
import { SupplierController } from './supplier.controller';
import { NotificationService } from '@/common/services/notification.service';

@Module({
  imports: [PrismaModule],
  controllers: [SupplierController],
  providers: [
    { provide: SUPPLIER_REPOSITORY, useClass: PrismaSupplierRepository },
    {
      provide: GetSupplierUseCase,
      useFactory: (repo: ISupplierRepository) => new GetSupplierUseCase(repo),
      inject: [SUPPLIER_REPOSITORY],
    },
    {
      provide: ListSuppliersUseCase,
      useFactory: (repo: ISupplierRepository) => new ListSuppliersUseCase(repo),
      inject: [SUPPLIER_REPOSITORY],
    },
    {
      provide: CreateSupplierUseCase,
      useFactory: (repo: ISupplierRepository, notifications: NotificationService) => new CreateSupplierUseCase(repo, notifications),
      inject: [SUPPLIER_REPOSITORY, NotificationService],
    },
    {
      provide: UpdateSupplierUseCase,
      useFactory: (repo: ISupplierRepository) => new UpdateSupplierUseCase(repo),
      inject: [SUPPLIER_REPOSITORY],
    },
    {
      provide: DeleteSupplierUseCase,
      useFactory: (repo: ISupplierRepository) => new DeleteSupplierUseCase(repo),
      inject: [SUPPLIER_REPOSITORY],
    },
  ],
  exports: [SUPPLIER_REPOSITORY],
})
export class SupplierModule {}
