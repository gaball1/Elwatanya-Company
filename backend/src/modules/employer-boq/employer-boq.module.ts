import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { BuildingModule } from '@/modules/building/building.module';
import { AnalyticalBoqModule } from '@/modules/analytical-boq/analytical-boq.module';
import { BUILDING_REPOSITORY } from '@/modules/building/domain/building.repository';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import { OwnershipService } from '@/common/services/ownership.service';
import { AuditService } from '@/modules/audit/audit.service';
import { NotificationService } from '@/common/services/notification.service';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { EMPLOYER_BOQ_REPOSITORY } from './domain/employer-boq.repository';
import { PrismaEmployerBoqRepository } from './infrastructure/prisma-employer-boq.repository';
import { ListEmployerBoqItemsUseCase } from './application/use-cases/list-employer-boq-items.use-case';
import { SetEmployerBoqItemsUseCase } from './application/use-cases/set-employer-boq-items.use-case';
import { UpsertEmployerBoqItemUseCase } from './application/use-cases/upsert-employer-boq-item.use-case';
import { DeleteEmployerBoqItemUseCase } from './application/use-cases/delete-employer-boq-item.use-case';
import { ClearEmployerBoqItemsUseCase } from './application/use-cases/clear-employer-boq-items.use-case';
import { EmployerBoqController } from './employer-boq.controller';
import {
  SyncAnalyticalFromEmployerUseCase,
  AddAnalyticalFromEmployerUseCase,
} from '@/modules/analytical-boq/application/use-cases/sync-analytical-from-employer.use-case';
import { RemoveAnalyticalBoqItemUseCase } from '@/modules/analytical-boq/application/use-cases/remove-analytical-boq-item.use-case';

@Module({
  imports: [PrismaModule, BuildingModule, forwardRef(() => AnalyticalBoqModule)],
  controllers: [EmployerBoqController],
  providers: [
    { provide: EMPLOYER_BOQ_REPOSITORY, useClass: PrismaEmployerBoqRepository },
    {
      provide: OwnershipService,
      useFactory: (prisma: PrismaService) => new OwnershipService(prisma),
      inject: [PrismaService],
    },
    {
      provide: ListEmployerBoqItemsUseCase,
      useFactory: (
        employerBoq: PrismaEmployerBoqRepository,
        buildings: IBuildingRepository,
        ownership: OwnershipService,
      ) => new ListEmployerBoqItemsUseCase(employerBoq, buildings, ownership),
      inject: [EMPLOYER_BOQ_REPOSITORY, BUILDING_REPOSITORY, OwnershipService],
    },
    {
      provide: SetEmployerBoqItemsUseCase,
      useFactory: (
        employerBoq: PrismaEmployerBoqRepository,
        buildings: IBuildingRepository,
        ownership: OwnershipService,
        audit: AuditService,
        eventBus: EventBusImpl,
      ) => new SetEmployerBoqItemsUseCase(employerBoq, buildings, ownership, audit, eventBus),
      inject: [EMPLOYER_BOQ_REPOSITORY, BUILDING_REPOSITORY, OwnershipService, AuditService, EventBusImpl],
    },
    {
      provide: UpsertEmployerBoqItemUseCase,
      useFactory: (
        employerBoq: PrismaEmployerBoqRepository,
        buildings: IBuildingRepository,
        syncAnalytical: SyncAnalyticalFromEmployerUseCase,
        addAnalytical: AddAnalyticalFromEmployerUseCase,
        ownership: OwnershipService,
        audit: AuditService,
        notifications: NotificationService,
        eventBus: EventBusImpl,
      ) =>
        new UpsertEmployerBoqItemUseCase(
          employerBoq,
          buildings,
          syncAnalytical,
          addAnalytical,
          ownership,
          audit,
          notifications,
          eventBus,
        ),
      inject: [
        EMPLOYER_BOQ_REPOSITORY,
        BUILDING_REPOSITORY,
        SyncAnalyticalFromEmployerUseCase,
        AddAnalyticalFromEmployerUseCase,
        OwnershipService,
        AuditService,
        NotificationService,
        EventBusImpl,
      ],
    },
    {
      provide: DeleteEmployerBoqItemUseCase,
      useFactory: (
        employerBoq: PrismaEmployerBoqRepository,
        buildings: IBuildingRepository,
        removeAnalytical: RemoveAnalyticalBoqItemUseCase,
        ownership: OwnershipService,
        audit: AuditService,
        notifications: NotificationService,
      ) =>
        new DeleteEmployerBoqItemUseCase(
          employerBoq,
          buildings,
          removeAnalytical,
          ownership,
          audit,
          notifications,
        ),
      inject: [
        EMPLOYER_BOQ_REPOSITORY,
        BUILDING_REPOSITORY,
        RemoveAnalyticalBoqItemUseCase,
        OwnershipService,
        AuditService,
        NotificationService,
      ],
    },
    {
      provide: ClearEmployerBoqItemsUseCase,
      useFactory: (
        employerBoq: PrismaEmployerBoqRepository,
        buildings: IBuildingRepository,
        removeAnalytical: RemoveAnalyticalBoqItemUseCase,
        ownership: OwnershipService,
        audit: AuditService,
        notifications: NotificationService,
      ) =>
        new ClearEmployerBoqItemsUseCase(
          employerBoq,
          buildings,
          removeAnalytical,
          ownership,
          audit,
          notifications,
        ),
      inject: [
        EMPLOYER_BOQ_REPOSITORY,
        BUILDING_REPOSITORY,
        RemoveAnalyticalBoqItemUseCase,
        OwnershipService,
        AuditService,
        NotificationService,
      ],
    },
  ],
  exports: [EMPLOYER_BOQ_REPOSITORY, ListEmployerBoqItemsUseCase],
})
export class EmployerBoqModule {}
