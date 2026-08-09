import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { BuildingModule } from '@/modules/building/building.module';
import { FinalBoqModule } from '@/modules/final-boq/final-boq.module';
import { SubcontractorModule } from '@/modules/subcontractor/subcontractor.module';
import { BUILDING_REPOSITORY } from '@/modules/building/domain/building.repository';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import { OwnershipService } from '@/common/services/ownership.service';
import { AuditService } from '@/modules/audit/audit.service';
import { NotificationService } from '@/common/services/notification.service';
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
      provide: OwnershipService,
      useFactory: (prisma: PrismaService) => new OwnershipService(prisma),
      inject: [PrismaService],
    },
    {
      provide: FINAL_BOQ_ALLOCATION_READER,
      useFactory: (repo: IContractorBoqRepository) => new PrismaFinalBoqAllocationReader(repo),
      inject: [CONTRACTOR_BOQ_REPOSITORY],
    },
    {
      provide: ListContractorBoqItemsUseCase,
      useFactory: (repo: IContractorBoqRepository, buildings: IBuildingRepository, ownership: OwnershipService) =>
        new ListContractorBoqItemsUseCase(repo, buildings, ownership),
      inject: [CONTRACTOR_BOQ_REPOSITORY, BUILDING_REPOSITORY, OwnershipService],
    },
    {
      provide: SetContractorMetaUseCase,
      useFactory: (
        repo: IContractorBoqRepository,
        buildings: IBuildingRepository,
        subcontractors: ISubcontractorRepository,
        ownership: OwnershipService,
        audit: AuditService,
      ) => new SetContractorMetaUseCase(repo, buildings, subcontractors, ownership, audit),
      inject: [CONTRACTOR_BOQ_REPOSITORY, BUILDING_REPOSITORY, SUBCONTRACTOR_REPOSITORY, OwnershipService, AuditService],
    },
    {
      provide: GetContractorMetaUseCase,
      useFactory: (repo: IContractorBoqRepository, ownership: OwnershipService) =>
        new GetContractorMetaUseCase(repo, ownership),
      inject: [CONTRACTOR_BOQ_REPOSITORY, OwnershipService],
    },
    {
      provide: AllocateContractorItemUseCase,
      useFactory: (
        repo: IContractorBoqRepository,
        finalBoq: IFinalBoqRepository,
        buildings: IBuildingRepository,
        ownership: OwnershipService,
        audit: AuditService,
        notifications: NotificationService,
      ) => new AllocateContractorItemUseCase(repo, finalBoq, buildings, ownership, audit, notifications),
      inject: [CONTRACTOR_BOQ_REPOSITORY, FINAL_BOQ_REPOSITORY, BUILDING_REPOSITORY, OwnershipService, AuditService, NotificationService],
    },
    {
      provide: UpdateContractorItemQuantityUseCase,
      useFactory: (
        repo: IContractorBoqRepository,
        finalBoq: IFinalBoqRepository,
        buildings: IBuildingRepository,
        ownership: OwnershipService,
        audit: AuditService,
      ) => new UpdateContractorItemQuantityUseCase(repo, finalBoq, buildings, ownership, audit),
      inject: [CONTRACTOR_BOQ_REPOSITORY, FINAL_BOQ_REPOSITORY, BUILDING_REPOSITORY, OwnershipService, AuditService],
    },
    {
      provide: RemoveContractorItemUseCase,
      useFactory: (repo: IContractorBoqRepository, buildings: IBuildingRepository, ownership: OwnershipService, audit: AuditService) =>
        new RemoveContractorItemUseCase(repo, buildings, ownership, audit),
      inject: [CONTRACTOR_BOQ_REPOSITORY, BUILDING_REPOSITORY, OwnershipService, AuditService],
    },
    {
      provide: GetAvailableContractorQtyUseCase,
      useFactory: (
        repo: IContractorBoqRepository,
        finalBoq: IFinalBoqRepository,
        buildings: IBuildingRepository,
        ownership: OwnershipService,
      ) => new GetAvailableContractorQtyUseCase(repo, finalBoq, buildings, ownership),
      inject: [CONTRACTOR_BOQ_REPOSITORY, FINAL_BOQ_REPOSITORY, BUILDING_REPOSITORY, OwnershipService],
    },
  ],
  exports: [CONTRACTOR_BOQ_REPOSITORY, FINAL_BOQ_ALLOCATION_READER],
})
export class ContractorBoqModule {}
