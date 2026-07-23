import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { BuildingModule } from '@/modules/building/building.module';
import { AnalyticalBoqModule } from '@/modules/analytical-boq/analytical-boq.module';
import { EmployerBoqModule } from '@/modules/employer-boq/employer-boq.module';
import { ContractorBoqModule } from '@/modules/contractor-boq/contractor-boq.module';
import { BUILDING_REPOSITORY } from '@/modules/building/domain/building.repository';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import { ANALYTICAL_BOQ_REPOSITORY } from '@/modules/analytical-boq/domain/analytical-boq.repository';
import { IAnalyticalBoqRepository } from '@/modules/analytical-boq/domain/analytical-boq.repository';
import { EMPLOYER_BOQ_REPOSITORY } from '@/modules/employer-boq/domain/employer-boq.repository';
import { IEmployerBoqRepository } from '@/modules/employer-boq/domain/employer-boq.repository';
import {
  FINAL_BOQ_ALLOCATION_READER,
  FINAL_BOQ_REPOSITORY,
  IFinalBoqAllocationReader,
  IFinalBoqRepository,
} from './domain/final-boq.repository';
import { PrismaFinalBoqRepository } from './infrastructure/prisma-final-boq.repository';
import { ListFinalBoqItemsUseCase } from './application/use-cases/list-final-boq-items.use-case';
import { SyncFinalFromAnalyticalUseCase } from './application/use-cases/sync-final-from-analytical.use-case';
import { ImportFinalFromEmployerUseCase } from './application/use-cases/import-final-from-employer.use-case';
import {
  UpdateFinalBoqItemUseCase,
  UpdateFinalItemQuantityUseCase,
  RemoveFinalBoqItemUseCase,
} from './application/use-cases/update-final-boq-item.use-case';
import {
  AnalyzeFinalBoqItemUseCase,
  AddFinalBoqComponentUseCase,
  UpdateFinalBoqComponentUseCase,
  RemoveFinalBoqComponentUseCase,
} from './application/use-cases/analyze-final-boq-item.use-case';
import { FinalBoqController } from './final-boq.controller';

@Module({
  imports: [
    PrismaModule,
    BuildingModule,
    forwardRef(() => AnalyticalBoqModule),
    forwardRef(() => EmployerBoqModule),
    forwardRef(() => ContractorBoqModule),
  ],
  controllers: [FinalBoqController],
  providers: [
    { provide: FINAL_BOQ_REPOSITORY, useClass: PrismaFinalBoqRepository },
    {
      provide: ListFinalBoqItemsUseCase,
      useFactory: (
        finalBoq: IFinalBoqRepository,
        buildings: IBuildingRepository,
        allocations: IFinalBoqAllocationReader,
      ) => new ListFinalBoqItemsUseCase(finalBoq, buildings, allocations),
      inject: [FINAL_BOQ_REPOSITORY, BUILDING_REPOSITORY, FINAL_BOQ_ALLOCATION_READER],
    },
    {
      provide: SyncFinalFromAnalyticalUseCase,
      useFactory: (
        finalBoq: IFinalBoqRepository,
        analyticalBoq: IAnalyticalBoqRepository,
        buildings: IBuildingRepository,
        allocations: IFinalBoqAllocationReader,
      ) => new SyncFinalFromAnalyticalUseCase(finalBoq, analyticalBoq, buildings, allocations),
      inject: [
        FINAL_BOQ_REPOSITORY,
        ANALYTICAL_BOQ_REPOSITORY,
        BUILDING_REPOSITORY,
        FINAL_BOQ_ALLOCATION_READER,
      ],
    },
    {
      provide: ImportFinalFromEmployerUseCase,
      useFactory: (
        finalBoq: IFinalBoqRepository,
        employerBoq: IEmployerBoqRepository,
        buildings: IBuildingRepository,
        allocations: IFinalBoqAllocationReader,
      ) => new ImportFinalFromEmployerUseCase(finalBoq, employerBoq, buildings, allocations),
      inject: [
        FINAL_BOQ_REPOSITORY,
        EMPLOYER_BOQ_REPOSITORY,
        BUILDING_REPOSITORY,
        FINAL_BOQ_ALLOCATION_READER,
      ],
    },
    {
      provide: UpdateFinalBoqItemUseCase,
      useFactory: (
        finalBoq: IFinalBoqRepository,
        buildings: IBuildingRepository,
        allocations: IFinalBoqAllocationReader,
      ) => new UpdateFinalBoqItemUseCase(finalBoq, buildings, allocations),
      inject: [FINAL_BOQ_REPOSITORY, BUILDING_REPOSITORY, FINAL_BOQ_ALLOCATION_READER],
    },
    {
      provide: UpdateFinalItemQuantityUseCase,
      useFactory: (
        finalBoq: IFinalBoqRepository,
        buildings: IBuildingRepository,
        allocations: IFinalBoqAllocationReader,
      ) => new UpdateFinalItemQuantityUseCase(finalBoq, buildings, allocations),
      inject: [FINAL_BOQ_REPOSITORY, BUILDING_REPOSITORY, FINAL_BOQ_ALLOCATION_READER],
    },
    {
      provide: RemoveFinalBoqItemUseCase,
      useFactory: (finalBoq: IFinalBoqRepository, buildings: IBuildingRepository) =>
        new RemoveFinalBoqItemUseCase(finalBoq, buildings),
      inject: [FINAL_BOQ_REPOSITORY, BUILDING_REPOSITORY],
    },
    {
      provide: AnalyzeFinalBoqItemUseCase,
      useFactory: (
        finalBoq: IFinalBoqRepository,
        buildings: IBuildingRepository,
        allocations: IFinalBoqAllocationReader,
      ) => new AnalyzeFinalBoqItemUseCase(finalBoq, buildings, allocations),
      inject: [FINAL_BOQ_REPOSITORY, BUILDING_REPOSITORY, FINAL_BOQ_ALLOCATION_READER],
    },
    {
      provide: AddFinalBoqComponentUseCase,
      useFactory: (
        finalBoq: IFinalBoqRepository,
        buildings: IBuildingRepository,
        allocations: IFinalBoqAllocationReader,
      ) => new AddFinalBoqComponentUseCase(finalBoq, buildings, allocations),
      inject: [FINAL_BOQ_REPOSITORY, BUILDING_REPOSITORY, FINAL_BOQ_ALLOCATION_READER],
    },
    {
      provide: UpdateFinalBoqComponentUseCase,
      useFactory: (
        finalBoq: IFinalBoqRepository,
        buildings: IBuildingRepository,
        allocations: IFinalBoqAllocationReader,
      ) => new UpdateFinalBoqComponentUseCase(finalBoq, buildings, allocations),
      inject: [FINAL_BOQ_REPOSITORY, BUILDING_REPOSITORY, FINAL_BOQ_ALLOCATION_READER],
    },
    {
      provide: RemoveFinalBoqComponentUseCase,
      useFactory: (
        finalBoq: IFinalBoqRepository,
        buildings: IBuildingRepository,
        allocations: IFinalBoqAllocationReader,
      ) => new RemoveFinalBoqComponentUseCase(finalBoq, buildings, allocations),
      inject: [FINAL_BOQ_REPOSITORY, BUILDING_REPOSITORY, FINAL_BOQ_ALLOCATION_READER],
    },
  ],
  exports: [
    FINAL_BOQ_REPOSITORY,
    SyncFinalFromAnalyticalUseCase,
  ],
})
export class FinalBoqModule {}
