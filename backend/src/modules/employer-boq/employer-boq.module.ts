import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { BuildingModule } from '@/modules/building/building.module';
import { AnalyticalBoqModule } from '@/modules/analytical-boq/analytical-boq.module';
import { BUILDING_REPOSITORY } from '@/modules/building/domain/building.repository';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import { EMPLOYER_BOQ_REPOSITORY } from './domain/employer-boq.repository';
import { PrismaEmployerBoqRepository } from './infrastructure/prisma-employer-boq.repository';
import { ListEmployerBoqItemsUseCase } from './application/use-cases/list-employer-boq-items.use-case';
import { SetEmployerBoqItemsUseCase } from './application/use-cases/set-employer-boq-items.use-case';
import { UpsertEmployerBoqItemUseCase } from './application/use-cases/upsert-employer-boq-item.use-case';
import { EmployerBoqController } from './employer-boq.controller';
import {
  SyncAnalyticalFromEmployerUseCase,
  AddAnalyticalFromEmployerUseCase,
} from '@/modules/analytical-boq/application/use-cases/sync-analytical-from-employer.use-case';

@Module({
  imports: [PrismaModule, BuildingModule, forwardRef(() => AnalyticalBoqModule)],
  controllers: [EmployerBoqController],
  providers: [
    { provide: EMPLOYER_BOQ_REPOSITORY, useClass: PrismaEmployerBoqRepository },
    {
      provide: ListEmployerBoqItemsUseCase,
      useFactory: (
        employerBoq: PrismaEmployerBoqRepository,
        buildings: IBuildingRepository,
      ) => new ListEmployerBoqItemsUseCase(employerBoq, buildings),
      inject: [EMPLOYER_BOQ_REPOSITORY, BUILDING_REPOSITORY],
    },
    {
      provide: SetEmployerBoqItemsUseCase,
      useFactory: (
        employerBoq: PrismaEmployerBoqRepository,
        buildings: IBuildingRepository,
      ) => new SetEmployerBoqItemsUseCase(employerBoq, buildings),
      inject: [EMPLOYER_BOQ_REPOSITORY, BUILDING_REPOSITORY],
    },
    {
      provide: UpsertEmployerBoqItemUseCase,
      useFactory: (
        employerBoq: PrismaEmployerBoqRepository,
        buildings: IBuildingRepository,
        syncAnalytical: SyncAnalyticalFromEmployerUseCase,
        addAnalytical: AddAnalyticalFromEmployerUseCase,
      ) =>
        new UpsertEmployerBoqItemUseCase(
          employerBoq,
          buildings,
          syncAnalytical,
          addAnalytical,
        ),
      inject: [
        EMPLOYER_BOQ_REPOSITORY,
        BUILDING_REPOSITORY,
        SyncAnalyticalFromEmployerUseCase,
        AddAnalyticalFromEmployerUseCase,
      ],
    },
  ],
  exports: [EMPLOYER_BOQ_REPOSITORY, ListEmployerBoqItemsUseCase],
})
export class EmployerBoqModule {}
