import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { BuildingModule } from '@/modules/building/building.module';
import { ContractorBoqModule } from '@/modules/contractor-boq/contractor-boq.module';
import { BUILDING_REPOSITORY } from '@/modules/building/domain/building.repository';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import { CONTRACTOR_BOQ_REPOSITORY } from '@/modules/contractor-boq/domain/contractor-boq.repository';
import { IContractorBoqRepository } from '@/modules/contractor-boq/domain/contractor-boq.repository';
import { EXTRACT_REPOSITORY, IExtractRepository } from './domain/extract.repository';
import { PrismaExtractRepository } from './infrastructure/prisma-extract.repository';
import {
  ListExtractsUseCase,
  GetExtractMetaUseCase,
  SaveExtractUseCase,
  GetExtractByIdUseCase,
  DeleteExtractUseCase,
} from './application/use-cases/extract.use-cases';
import { ExtractController } from './extract.controller';

@Module({
  imports: [PrismaModule, BuildingModule, ContractorBoqModule],
  controllers: [ExtractController],
  providers: [
    { provide: EXTRACT_REPOSITORY, useClass: PrismaExtractRepository },
    {
      provide: ListExtractsUseCase,
      useFactory: (
        extracts: IExtractRepository,
        contractorBoq: IContractorBoqRepository,
        buildings: IBuildingRepository,
      ) => new ListExtractsUseCase(extracts, contractorBoq, buildings),
      inject: [EXTRACT_REPOSITORY, CONTRACTOR_BOQ_REPOSITORY, BUILDING_REPOSITORY],
    },
    {
      provide: GetExtractMetaUseCase,
      useFactory: (extracts: IExtractRepository, contractorBoq: IContractorBoqRepository) =>
        new GetExtractMetaUseCase(extracts, contractorBoq),
      inject: [EXTRACT_REPOSITORY, CONTRACTOR_BOQ_REPOSITORY],
    },
    {
      provide: SaveExtractUseCase,
      useFactory: (
        extracts: IExtractRepository,
        contractorBoq: IContractorBoqRepository,
        buildings: IBuildingRepository,
      ) => new SaveExtractUseCase(extracts, contractorBoq, buildings),
      inject: [EXTRACT_REPOSITORY, CONTRACTOR_BOQ_REPOSITORY, BUILDING_REPOSITORY],
    },
    {
      provide: GetExtractByIdUseCase,
      useFactory: (extracts: IExtractRepository, contractorBoq: IContractorBoqRepository) =>
        new GetExtractByIdUseCase(extracts, contractorBoq),
      inject: [EXTRACT_REPOSITORY, CONTRACTOR_BOQ_REPOSITORY],
    },
    {
      provide: DeleteExtractUseCase,
      useFactory: (extracts: IExtractRepository) => new DeleteExtractUseCase(extracts),
      inject: [EXTRACT_REPOSITORY],
    },
  ],
  exports: [EXTRACT_REPOSITORY],
})
export class ExtractModule {}
