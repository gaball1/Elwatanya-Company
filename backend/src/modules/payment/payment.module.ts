import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { OwnershipService } from '@/common/services/ownership.service';
import { FinancialService } from '@/common/services/financial.service';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { BuildingModule } from '@/modules/building/building.module';
import { BUILDING_REPOSITORY } from '@/modules/building/domain/building.repository';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import { PAYMENT_REPOSITORY, IPaymentRepository } from './domain/payment.repository';
import { PrismaPaymentRepository } from './infrastructure/prisma-payment.repository';
import {
  ListPaymentsUseCase,
  AddPaymentUseCase,
  GetPaymentUseCase,
  UpdatePaymentUseCase,
  DeletePaymentUseCase,
} from './application/use-cases/payment.use-cases';
import { PaymentController } from './payment.controller';

@Module({
  imports: [PrismaModule, BuildingModule],
  controllers: [PaymentController],
  providers: [
    FinancialService,
    { provide: PAYMENT_REPOSITORY, useClass: PrismaPaymentRepository },
    {
      provide: OwnershipService,
      useFactory: (prisma: PrismaService) => new OwnershipService(prisma),
      inject: [PrismaService],
    },
    {
      provide: ListPaymentsUseCase,
      useFactory: (
        payments: IPaymentRepository,
        buildings: IBuildingRepository,
        ownership: OwnershipService,
      ) => new ListPaymentsUseCase(payments, buildings, ownership),
      inject: [PAYMENT_REPOSITORY, BUILDING_REPOSITORY, OwnershipService],
    },
    {
      provide: AddPaymentUseCase,
      useFactory: (
        payments: IPaymentRepository,
        buildings: IBuildingRepository,
        ownership: OwnershipService,
        fs: FinancialService,
        prisma: PrismaService,
        eventBus: EventBusImpl,
      ) => new AddPaymentUseCase(payments, buildings, ownership, fs, prisma, eventBus),
      inject: [PAYMENT_REPOSITORY, BUILDING_REPOSITORY, OwnershipService, FinancialService, PrismaService, EventBusImpl],
    },
    {
      provide: GetPaymentUseCase,
      useFactory: (
        payments: IPaymentRepository,
        buildings: IBuildingRepository,
        ownership: OwnershipService,
      ) => new GetPaymentUseCase(payments, buildings, ownership),
      inject: [PAYMENT_REPOSITORY, BUILDING_REPOSITORY, OwnershipService],
    },
    {
      provide: UpdatePaymentUseCase,
      useFactory: (
        payments: IPaymentRepository,
        buildings: IBuildingRepository,
        ownership: OwnershipService,
        fs: FinancialService,
        prisma: PrismaService,
        eventBus: EventBusImpl,
      ) => new UpdatePaymentUseCase(payments, buildings, ownership, fs, prisma, eventBus),
      inject: [PAYMENT_REPOSITORY, BUILDING_REPOSITORY, OwnershipService, FinancialService, PrismaService, EventBusImpl],
    },
    {
      provide: DeletePaymentUseCase,
      useFactory: (
        payments: IPaymentRepository,
        buildings: IBuildingRepository,
        ownership: OwnershipService,
        fs: FinancialService,
        prisma: PrismaService,
      ) => new DeletePaymentUseCase(payments, buildings, ownership, fs, prisma),
      inject: [PAYMENT_REPOSITORY, BUILDING_REPOSITORY, OwnershipService, FinancialService, PrismaService],
    },
  ],
  exports: [PAYMENT_REPOSITORY],
})
export class PaymentModule {}
