import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { BuildingModule } from '@/modules/building/building.module';
import { BUILDING_REPOSITORY } from '@/modules/building/domain/building.repository';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import { EmployerBoqModule } from '@/modules/employer-boq/employer-boq.module';
import { EMPLOYER_BOQ_REPOSITORY } from '@/modules/employer-boq/domain/employer-boq.repository';
import { IEmployerBoqRepository } from '@/modules/employer-boq/domain/employer-boq.repository';
import { FinalBoqModule } from '@/modules/final-boq/final-boq.module';
import { SyncFinalFromAnalyticalUseCase } from '@/modules/final-boq/application/use-cases/sync-final-from-analytical.use-case';
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
      provide: ListAnalyticalBoqItemsUseCase,
      useFactory: (
        analyticalBoq: PrismaAnalyticalBoqRepository,
        buildings: IBuildingRepository,
      ) => new ListAnalyticalBoqItemsUseCase(analyticalBoq, buildings),
      inject: [ANALYTICAL_BOQ_REPOSITORY, BUILDING_REPOSITORY],
    },
    {
      provide: SetAnalyticalBoqItemsUseCase,
      useFactory: (
        analyticalBoq: PrismaAnalyticalBoqRepository,
        buildings: IBuildingRepository,
        syncFinal: SyncFinalFromAnalyticalUseCase,
      ) => new SetAnalyticalBoqItemsUseCase(analyticalBoq, buildings, syncFinal),
      inject: [ANALYTICAL_BOQ_REPOSITORY, BUILDING_REPOSITORY, SyncFinalFromAnalyticalUseCase],
    },
    {
      provide: UpdateAnalyticalBoqItemUseCase,
      useFactory: (
        analyticalBoq: PrismaAnalyticalBoqRepository,
        buildings: IBuildingRepository,
        syncFinal: SyncFinalFromAnalyticalUseCase,
      ) => new UpdateAnalyticalBoqItemUseCase(analyticalBoq, buildings, syncFinal),
      inject: [ANALYTICAL_BOQ_REPOSITORY, BUILDING_REPOSITORY, SyncFinalFromAnalyticalUseCase],
    },
    {
      provide: RemoveAnalyticalBoqItemUseCase,
      useFactory: (
        analyticalBoq: PrismaAnalyticalBoqRepository,
        buildings: IBuildingRepository,
        syncFinal: SyncFinalFromAnalyticalUseCase,
      ) => new RemoveAnalyticalBoqItemUseCase(analyticalBoq, buildings, syncFinal),
      inject: [ANALYTICAL_BOQ_REPOSITORY, BUILDING_REPOSITORY, SyncFinalFromAnalyticalUseCase],
    },
    {
      provide: ImportAnalyticalFromEmployerUseCase,
      useFactory: (
        analyticalBoq: PrismaAnalyticalBoqRepository,
        employerBoq: IEmployerBoqRepository,
        buildings: IBuildingRepository,
        syncFinal: SyncFinalFromAnalyticalUseCase,
      ) =>
        new ImportAnalyticalFromEmployerUseCase(analyticalBoq, employerBoq, buildings, syncFinal),
      inject: [
        ANALYTICAL_BOQ_REPOSITORY,
        EMPLOYER_BOQ_REPOSITORY,
        BUILDING_REPOSITORY,
        SyncFinalFromAnalyticalUseCase,
      ],
    },
    {
      provide: SyncAnalyticalFromEmployerUseCase,
      useFactory: (
        analyticalBoq: PrismaAnalyticalBoqRepository,
        employerBoq: IEmployerBoqRepository,
        syncFinal: SyncFinalFromAnalyticalUseCase,
      ) => new SyncAnalyticalFromEmployerUseCase(analyticalBoq, employerBoq, syncFinal),
      inject: [ANALYTICAL_BOQ_REPOSITORY, EMPLOYER_BOQ_REPOSITORY, SyncFinalFromAnalyticalUseCase],
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
  ],
})
export class AnalyticalBoqModule {}
