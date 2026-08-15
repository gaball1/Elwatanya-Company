import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { BuildingModule } from '@/modules/building/building.module';
import { BUILDING_REPOSITORY } from '@/modules/building/domain/building.repository';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import { EmployerBoqModule } from '@/modules/employer-boq/employer-boq.module';
import { EMPLOYER_BOQ_REPOSITORY } from '@/modules/employer-boq/domain/employer-boq.repository';
import { IEmployerBoqRepository } from '@/modules/employer-boq/domain/employer-boq.repository';
import { FinalBoqModule } from '@/modules/final-boq/final-boq.module';
import { SyncFinalFromAnalyticalUseCase } from '@/modules/final-boq/application/use-cases/sync-final-from-analytical.use-case';
import { FINAL_BOQ_REPOSITORY } from '@/modules/final-boq/domain/final-boq.repository';
import { IFinalBoqRepository } from '@/modules/final-boq/domain/final-boq.repository';
import { OwnershipService } from '@/common/services/ownership.service';
import { AuditService } from '@/modules/audit/audit.service';
import { ANALYTICAL_BOQ_REPOSITORY } from './domain/analytical-boq.repository';
import { PrismaAnalyticalBoqRepository } from './infrastructure/prisma-analytical-boq.repository';
import { ListAnalyticalBoqItemsUseCase } from './application/use-cases/list-analytical-boq-items.use-case';
import { SetAnalyticalBoqItemsUseCase } from './application/use-cases/set-analytical-boq-items.use-case';
import { UpdateAnalyticalBoqItemUseCase } from './application/use-cases/update-analytical-boq-item.use-case';
import { RemoveAnalyticalBoqItemUseCase } from './application/use-cases/remove-analytical-boq-item.use-case';
import { ImportAnalyticalFromEmployerUseCase } from './application/use-cases/import-analytical-from-employer.use-case';
import {
  SyncAnalyticalFromEmployerUseCase,
  AddAnalyticalFromEmployerUseCase,
} from './application/use-cases/sync-analytical-from-employer.use-case';
import { AnalyticalBoqController } from './analytical-boq.controller';

@Module({
  imports: [
    PrismaModule,
    BuildingModule,
    forwardRef(() => EmployerBoqModule),
    forwardRef(() => FinalBoqModule),
  ],
  controllers: [AnalyticalBoqController],
  providers: [
    { provide: ANALYTICAL_BOQ_REPOSITORY, useClass: PrismaAnalyticalBoqRepository },
    {
      provide: OwnershipService,
      useFactory: (prisma: PrismaService) => new OwnershipService(prisma),
      inject: [PrismaService],
    },
    {
      provide: ListAnalyticalBoqItemsUseCase,
      useFactory: (
        analyticalBoq: PrismaAnalyticalBoqRepository,
        buildings: IBuildingRepository,
        ownership: OwnershipService,
      ) => new ListAnalyticalBoqItemsUseCase(analyticalBoq, buildings, ownership),
      inject: [ANALYTICAL_BOQ_REPOSITORY, BUILDING_REPOSITORY, OwnershipService],
    },
    {
      provide: SetAnalyticalBoqItemsUseCase,
      useFactory: (
        analyticalBoq: PrismaAnalyticalBoqRepository,
        buildings: IBuildingRepository,
        syncFinal: SyncFinalFromAnalyticalUseCase,
        finalBoq: IFinalBoqRepository,
        ownership: OwnershipService,
        audit: AuditService,
      ) => new SetAnalyticalBoqItemsUseCase(analyticalBoq, buildings, syncFinal, finalBoq, ownership, audit),
      inject: [ANALYTICAL_BOQ_REPOSITORY, BUILDING_REPOSITORY, SyncFinalFromAnalyticalUseCase, FINAL_BOQ_REPOSITORY, OwnershipService, AuditService],
    },
    {
      provide: UpdateAnalyticalBoqItemUseCase,
      useFactory: (
        analyticalBoq: PrismaAnalyticalBoqRepository,
        buildings: IBuildingRepository,
        syncFinal: SyncFinalFromAnalyticalUseCase,
        finalBoq: IFinalBoqRepository,
        ownership: OwnershipService,
        audit: AuditService,
      ) => new UpdateAnalyticalBoqItemUseCase(analyticalBoq, buildings, syncFinal, finalBoq, ownership, audit),
      inject: [ANALYTICAL_BOQ_REPOSITORY, BUILDING_REPOSITORY, SyncFinalFromAnalyticalUseCase, FINAL_BOQ_REPOSITORY, OwnershipService, AuditService],
    },
    {
      provide: RemoveAnalyticalBoqItemUseCase,
      useFactory: (
        analyticalBoq: PrismaAnalyticalBoqRepository,
        buildings: IBuildingRepository,
        syncFinal: SyncFinalFromAnalyticalUseCase,
        finalBoq: IFinalBoqRepository,
        ownership: OwnershipService,
        audit: AuditService,
      ) => new RemoveAnalyticalBoqItemUseCase(analyticalBoq, buildings, syncFinal, finalBoq, ownership, audit),
      inject: [ANALYTICAL_BOQ_REPOSITORY, BUILDING_REPOSITORY, SyncFinalFromAnalyticalUseCase, FINAL_BOQ_REPOSITORY, OwnershipService, AuditService],
    },
    {
      provide: ImportAnalyticalFromEmployerUseCase,
      useFactory: (
        analyticalBoq: PrismaAnalyticalBoqRepository,
        employerBoq: IEmployerBoqRepository,
        buildings: IBuildingRepository,
        syncFinal: SyncFinalFromAnalyticalUseCase,
        ownership: OwnershipService,
        audit: AuditService,
      ) =>
        new ImportAnalyticalFromEmployerUseCase(analyticalBoq, employerBoq, buildings, syncFinal, ownership, audit),
      inject: [
        ANALYTICAL_BOQ_REPOSITORY,
        EMPLOYER_BOQ_REPOSITORY,
        BUILDING_REPOSITORY,
        SyncFinalFromAnalyticalUseCase,
        OwnershipService,
        AuditService,
      ],
    },
    {
      provide: SyncAnalyticalFromEmployerUseCase,
      useFactory: (
        analyticalBoq: PrismaAnalyticalBoqRepository,
        employerBoq: IEmployerBoqRepository,
        syncFinal: SyncFinalFromAnalyticalUseCase,
        finalBoq: IFinalBoqRepository,
      ) => new SyncAnalyticalFromEmployerUseCase(analyticalBoq, employerBoq, syncFinal, finalBoq),
      inject: [ANALYTICAL_BOQ_REPOSITORY, EMPLOYER_BOQ_REPOSITORY, SyncFinalFromAnalyticalUseCase, FINAL_BOQ_REPOSITORY],
    },
    {
      provide: AddAnalyticalFromEmployerUseCase,
      useFactory: (
        analyticalBoq: PrismaAnalyticalBoqRepository,
        employerBoq: IEmployerBoqRepository,
        syncFinal: SyncFinalFromAnalyticalUseCase,
      ) => new AddAnalyticalFromEmployerUseCase(analyticalBoq, employerBoq, syncFinal),
      inject: [ANALYTICAL_BOQ_REPOSITORY, EMPLOYER_BOQ_REPOSITORY, SyncFinalFromAnalyticalUseCase],
    },
  ],
  exports: [
    ANALYTICAL_BOQ_REPOSITORY,
    SyncAnalyticalFromEmployerUseCase,
    AddAnalyticalFromEmployerUseCase,
    RemoveAnalyticalBoqItemUseCase,
  ],
})
export class AnalyticalBoqModule {}
