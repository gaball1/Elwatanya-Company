import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { BuildingModule } from '@/modules/building/building.module';
import { BUILDING_REPOSITORY } from '@/modules/building/domain/building.repository';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import { PAYMENT_REPOSITORY, IPaymentRepository } from './domain/payment.repository';
import { PrismaPaymentRepository } from './infrastructure/prisma-payment.repository';
import {
  ListPaymentsUseCase,
  AddPaymentUseCase,
} from './application/use-cases/payment.use-cases';
import { PaymentController } from './payment.controller';

@Module({
  imports: [PrismaModule, BuildingModule],
  controllers: [PaymentController],
  providers: [
    { provide: PAYMENT_REPOSITORY, useClass: PrismaPaymentRepository },
    {
      provide: ListPaymentsUseCase,
      useFactory: (payments: IPaymentRepository, buildings: IBuildingRepository) =>
        new ListPaymentsUseCase(payments, buildings),
      inject: [PAYMENT_REPOSITORY, BUILDING_REPOSITORY],
    },
    {
      provide: AddPaymentUseCase,
      useFactory: (payments: IPaymentRepository, buildings: IBuildingRepository) =>
        new AddPaymentUseCase(payments, buildings),
      inject: [PAYMENT_REPOSITORY, BUILDING_REPOSITORY],
    },
  ],
  exports: [PAYMENT_REPOSITORY],
})
export class PaymentModule {}
