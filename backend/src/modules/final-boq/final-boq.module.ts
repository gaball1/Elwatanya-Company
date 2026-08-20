import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
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
import { OwnershipService } from '@/common/services/ownership.service';
import { AuditService } from '@/modules/audit/audit.service';
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
  UnanalyzeFinalBoqItemUseCase,
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
      provide: OwnershipService,
      useFactory: (prisma: PrismaService) => new OwnershipService(prisma),
      inject: [PrismaService],
    },
    {
      provide: ListFinalBoqItemsUseCase,
      useFactory: (
        finalBoq: IFinalBoqRepository,
        buildings: IBuildingRepository,
        allocations: IFinalBoqAllocationReader,
        ownership: OwnershipService,
      ) => new ListFinalBoqItemsUseCase(finalBoq, buildings, allocations, ownership),
      inject: [FINAL_BOQ_REPOSITORY, BUILDING_REPOSITORY, FINAL_BOQ_ALLOCATION_READER, OwnershipService],
    },
    {
      provide: SyncFinalFromAnalyticalUseCase,
      useFactory: (
        finalBoq: IFinalBoqRepository,
        analyticalBoq: IAnalyticalBoqRepository,
        buildings: IBuildingRepository,
        allocations: IFinalBoqAllocationReader,
        ownership: OwnershipService,
        audit: AuditService,
      ) => new SyncFinalFromAnalyticalUseCase(finalBoq, analyticalBoq, buildings, allocations, ownership, audit),
      inject: [
        FINAL_BOQ_REPOSITORY,
        ANALYTICAL_BOQ_REPOSITORY,
        BUILDING_REPOSITORY,
        FINAL_BOQ_ALLOCATION_READER,
        OwnershipService,
        AuditService,
      ],
    },
    {
      provide: ImportFinalFromEmployerUseCase,
      useFactory: (
        finalBoq: IFinalBoqRepository,
        employerBoq: IEmployerBoqRepository,
        buildings: IBuildingRepository,
        allocations: IFinalBoqAllocationReader,
        ownership: OwnershipService,
        audit: AuditService,
      ) => new ImportFinalFromEmployerUseCase(finalBoq, employerBoq, buildings, allocations, ownership, audit),
      inject: [
        FINAL_BOQ_REPOSITORY,
        EMPLOYER_BOQ_REPOSITORY,
        BUILDING_REPOSITORY,
        FINAL_BOQ_ALLOCATION_READER,
        OwnershipService,
        AuditService,
      ],
    },
    {
      provide: UpdateFinalBoqItemUseCase,
      useFactory: (
        finalBoq: IFinalBoqRepository,
        buildings: IBuildingRepository,
        allocations: IFinalBoqAllocationReader,
        ownership: OwnershipService,
        audit: AuditService,
      ) => new UpdateFinalBoqItemUseCase(finalBoq, buildings, allocations, ownership, audit),
      inject: [FINAL_BOQ_REPOSITORY, BUILDING_REPOSITORY, FINAL_BOQ_ALLOCATION_READER, OwnershipService, AuditService],
    },
    {
      provide: UpdateFinalItemQuantityUseCase,
      useFactory: (
        finalBoq: IFinalBoqRepository,
        buildings: IBuildingRepository,
        allocations: IFinalBoqAllocationReader,
        ownership: OwnershipService,
        audit: AuditService,
      ) => new UpdateFinalItemQuantityUseCase(finalBoq, buildings, allocations, ownership, audit),
      inject: [FINAL_BOQ_REPOSITORY, BUILDING_REPOSITORY, FINAL_BOQ_ALLOCATION_READER, OwnershipService, AuditService],
    },
    {
      provide: RemoveFinalBoqItemUseCase,
      useFactory: (finalBoq: IFinalBoqRepository, buildings: IBuildingRepository, ownership: OwnershipService, audit: AuditService) =>
        new RemoveFinalBoqItemUseCase(finalBoq, buildings, ownership, audit),
      inject: [FINAL_BOQ_REPOSITORY, BUILDING_REPOSITORY, OwnershipService, AuditService],
    },
    {
      provide: AnalyzeFinalBoqItemUseCase,
      useFactory: (
        finalBoq: IFinalBoqRepository,
        buildings: IBuildingRepository,
        allocations: IFinalBoqAllocationReader,
        ownership: OwnershipService,
        audit: AuditService,
      ) => new AnalyzeFinalBoqItemUseCase(finalBoq, buildings, allocations, ownership, audit),
      inject: [FINAL_BOQ_REPOSITORY, BUILDING_REPOSITORY, FINAL_BOQ_ALLOCATION_READER, OwnershipService, AuditService],
    },
    {
      provide: UnanalyzeFinalBoqItemUseCase,
      useFactory: (
        finalBoq: IFinalBoqRepository,
        buildings: IBuildingRepository,
        allocations: IFinalBoqAllocationReader,
        ownership: OwnershipService,
        audit: AuditService,
      ) => new UnanalyzeFinalBoqItemUseCase(finalBoq, buildings, allocations, ownership, audit),
      inject: [FINAL_BOQ_REPOSITORY, BUILDING_REPOSITORY, FINAL_BOQ_ALLOCATION_READER, OwnershipService, AuditService],
    },
    {
      provide: AddFinalBoqComponentUseCase,
      useFactory: (
        finalBoq: IFinalBoqRepository,
        buildings: IBuildingRepository,
        allocations: IFinalBoqAllocationReader,
        ownership: OwnershipService,
        audit: AuditService,
      ) => new AddFinalBoqComponentUseCase(finalBoq, buildings, allocations, ownership, audit),
      inject: [FINAL_BOQ_REPOSITORY, BUILDING_REPOSITORY, FINAL_BOQ_ALLOCATION_READER, OwnershipService, AuditService],
    },
    {
      provide: UpdateFinalBoqComponentUseCase,
      useFactory: (
        finalBoq: IFinalBoqRepository,
        buildings: IBuildingRepository,
        allocations: IFinalBoqAllocationReader,
        ownership: OwnershipService,
        audit: AuditService,
      ) => new UpdateFinalBoqComponentUseCase(finalBoq, buildings, allocations, ownership, audit),
      inject: [FINAL_BOQ_REPOSITORY, BUILDING_REPOSITORY, FINAL_BOQ_ALLOCATION_READER, OwnershipService, AuditService],
    },
    {
      provide: RemoveFinalBoqComponentUseCase,
      useFactory: (
        finalBoq: IFinalBoqRepository,
        buildings: IBuildingRepository,
        allocations: IFinalBoqAllocationReader,
        ownership: OwnershipService,
        audit: AuditService,
      ) => new RemoveFinalBoqComponentUseCase(finalBoq, buildings, allocations, ownership, audit),
      inject: [FINAL_BOQ_REPOSITORY, BUILDING_REPOSITORY, FINAL_BOQ_ALLOCATION_READER, OwnershipService, AuditService],
    },
  ],
  exports: [
    FINAL_BOQ_REPOSITORY,
    SyncFinalFromAnalyticalUseCase,
  ],
})
export class FinalBoqModule {}
