import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { OwnershipService } from '@/common/services/ownership.service';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
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
      provide: OwnershipService,
      useFactory: (prisma: PrismaService) => new OwnershipService(prisma),
      inject: [PrismaService],
    },
    {
      provide: ListExtractsUseCase,
      useFactory: (
        extracts: IExtractRepository,
        contractorBoq: IContractorBoqRepository,
        buildings: IBuildingRepository,
        ownership: OwnershipService,
      ) => new ListExtractsUseCase(extracts, contractorBoq, buildings, ownership),
      inject: [EXTRACT_REPOSITORY, CONTRACTOR_BOQ_REPOSITORY, BUILDING_REPOSITORY, OwnershipService],
    },
    {
      provide: GetExtractMetaUseCase,
      useFactory: (
        extracts: IExtractRepository,
        contractorBoq: IContractorBoqRepository,
        ownership: OwnershipService,
      ) => new GetExtractMetaUseCase(extracts, contractorBoq, ownership),
      inject: [EXTRACT_REPOSITORY, CONTRACTOR_BOQ_REPOSITORY, OwnershipService],
    },
    {
      provide: SaveExtractUseCase,
      useFactory: (
        extracts: IExtractRepository,
        contractorBoq: IContractorBoqRepository,
        buildings: IBuildingRepository,
        prisma: PrismaService,
        ownership: OwnershipService,
        eventBus: EventBusImpl,
      ) => new SaveExtractUseCase(extracts, contractorBoq, buildings, prisma, ownership, eventBus),
      inject: [EXTRACT_REPOSITORY, CONTRACTOR_BOQ_REPOSITORY, BUILDING_REPOSITORY, PrismaService, OwnershipService, EventBusImpl],
    },
    {
      provide: GetExtractByIdUseCase,
      useFactory: (
        extracts: IExtractRepository,
        contractorBoq: IContractorBoqRepository,
        ownership: OwnershipService,
      ) => new GetExtractByIdUseCase(extracts, contractorBoq, ownership),
      inject: [EXTRACT_REPOSITORY, CONTRACTOR_BOQ_REPOSITORY, OwnershipService],
    },
    {
      provide: DeleteExtractUseCase,
      useFactory: (
        extracts: IExtractRepository,
        ownership: OwnershipService,
      ) => new DeleteExtractUseCase(extracts, ownership),
      inject: [EXTRACT_REPOSITORY, OwnershipService],
    },
  ],
  exports: [EXTRACT_REPOSITORY],
})
export class ExtractModule {}
