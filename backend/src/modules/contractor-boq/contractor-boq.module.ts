import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { BuildingModule } from '@/modules/building/building.module';
import { FinalBoqModule } from '@/modules/final-boq/final-boq.module';
import { SubcontractorModule } from '@/modules/subcontractor/subcontractor.module';
import { BUILDING_REPOSITORY } from '@/modules/building/domain/building.repository';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import { FINAL_BOQ_REPOSITORY } from '@/modules/final-boq/domain/final-boq.repository';
import { IFinalBoqRepository } from '@/modules/final-boq/domain/final-boq.repository';
import { SUBCONTRACTOR_REPOSITORY } from '@/modules/subcontractor/domain/subcontractor.repository';
import { ISubcontractorRepository } from '@/modules/subcontractor/domain/subcontractor.repository';
import {
  CONTRACTOR_BOQ_REPOSITORY,
  IContractorBoqRepository,
} from './domain/contractor-boq.repository';
import { PrismaContractorBoqRepository } from './infrastructure/prisma-contractor-boq.repository';
import { PrismaFinalBoqAllocationReader } from './infrastructure/prisma-final-boq-allocation.reader';
import { FINAL_BOQ_ALLOCATION_READER } from '@/modules/final-boq/domain/final-boq.repository';
import {
  ListContractorBoqItemsUseCase,
  SetContractorMetaUseCase,
  GetContractorMetaUseCase,
  AllocateContractorItemUseCase,
  UpdateContractorItemQuantityUseCase,
  RemoveContractorItemUseCase,
  GetAvailableContractorQtyUseCase,
} from './application/use-cases/contractor-boq.use-cases';
import { ContractorBoqController } from './contractor-boq.controller';

@Module({
  imports: [
    PrismaModule,
    BuildingModule,
    SubcontractorModule,
    forwardRef(() => FinalBoqModule),
  ],
  controllers: [ContractorBoqController],
  providers: [
    { provide: CONTRACTOR_BOQ_REPOSITORY, useClass: PrismaContractorBoqRepository },
    {
      provide: FINAL_BOQ_ALLOCATION_READER,
      useFactory: (repo: IContractorBoqRepository) => new PrismaFinalBoqAllocationReader(repo),
      inject: [CONTRACTOR_BOQ_REPOSITORY],
    },
    {
      provide: ListContractorBoqItemsUseCase,
      useFactory: (repo: IContractorBoqRepository, buildings: IBuildingRepository) =>
        new ListContractorBoqItemsUseCase(repo, buildings),
      inject: [CONTRACTOR_BOQ_REPOSITORY, BUILDING_REPOSITORY],
    },
    {
      provide: SetContractorMetaUseCase,
      useFactory: (
        repo: IContractorBoqRepository,
        buildings: IBuildingRepository,
        subcontractors: ISubcontractorRepository,
      ) => new SetContractorMetaUseCase(repo, buildings, subcontractors),
      inject: [CONTRACTOR_BOQ_REPOSITORY, BUILDING_REPOSITORY, SUBCONTRACTOR_REPOSITORY],
    },
    {
      provide: GetContractorMetaUseCase,
      useFactory: (repo: IContractorBoqRepository) => new GetContractorMetaUseCase(repo),
      inject: [CONTRACTOR_BOQ_REPOSITORY],
    },
    {
      provide: AllocateContractorItemUseCase,
      useFactory: (
        repo: IContractorBoqRepository,
        finalBoq: IFinalBoqRepository,
        buildings: IBuildingRepository,
      ) => new AllocateContractorItemUseCase(repo, finalBoq, buildings),
      inject: [CONTRACTOR_BOQ_REPOSITORY, FINAL_BOQ_REPOSITORY, BUILDING_REPOSITORY],
    },
    {
      provide: UpdateContractorItemQuantityUseCase,
      useFactory: (
        repo: IContractorBoqRepository,
        finalBoq: IFinalBoqRepository,
        buildings: IBuildingRepository,
      ) => new UpdateContractorItemQuantityUseCase(repo, finalBoq, buildings),
      inject: [CONTRACTOR_BOQ_REPOSITORY, FINAL_BOQ_REPOSITORY, BUILDING_REPOSITORY],
    },
    {
      provide: RemoveContractorItemUseCase,
      useFactory: (repo: IContractorBoqRepository, buildings: IBuildingRepository) =>
        new RemoveContractorItemUseCase(repo, buildings),
      inject: [CONTRACTOR_BOQ_REPOSITORY, BUILDING_REPOSITORY],
    },
    {
      provide: GetAvailableContractorQtyUseCase,
      useFactory: (
        repo: IContractorBoqRepository,
        finalBoq: IFinalBoqRepository,
        buildings: IBuildingRepository,
      ) => new GetAvailableContractorQtyUseCase(repo, finalBoq, buildings),
      inject: [CONTRACTOR_BOQ_REPOSITORY, FINAL_BOQ_REPOSITORY, BUILDING_REPOSITORY],
    },
  ],
  exports: [CONTRACTOR_BOQ_REPOSITORY, FINAL_BOQ_ALLOCATION_READER],
})
export class ContractorBoqModule {}
