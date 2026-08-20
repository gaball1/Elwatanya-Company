import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { BuildingModule } from '@/modules/building/building.module';
import { FinalBoqModule } from '@/modules/final-boq/final-boq.module';
import { ContractorBoqModule } from '@/modules/contractor-boq/contractor-boq.module';
import { BUILDING_REPOSITORY } from '@/modules/building/domain/building.repository';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import { OwnershipService } from '@/common/services/ownership.service';
import { AuditService } from '@/modules/audit/audit.service';
import { FINAL_BOQ_REPOSITORY } from '@/modules/final-boq/domain/final-boq.repository';
import { IFinalBoqRepository } from '@/modules/final-boq/domain/final-boq.repository';
import { CONTRACTOR_BOQ_REPOSITORY } from '@/modules/contractor-boq/domain/contractor-boq.repository';
import { IContractorBoqRepository } from '@/modules/contractor-boq/domain/contractor-boq.repository';
import { DistributeComponentUseCase } from './application/use-cases/distribute-component.use-case';
import { DistributeItemUseCase } from './application/use-cases/distribute-item.use-case';
import { RemoveDistributionUseCase } from './application/use-cases/remove-distribution.use-case';
import { DistributionController } from './distribution.controller';

@Module({
  imports: [
    PrismaModule,
    BuildingModule,
    forwardRef(() => FinalBoqModule),
    forwardRef(() => ContractorBoqModule),
  ],
  controllers: [DistributionController],
  providers: [
    {
      provide: OwnershipService,
      useFactory: (prisma: PrismaService) => new OwnershipService(prisma),
      inject: [PrismaService],
    },
    {
      provide: DistributeComponentUseCase,
      useFactory: (
        finalBoq: IFinalBoqRepository,
        contractorBoq: IContractorBoqRepository,
        buildings: IBuildingRepository,
        ownership: OwnershipService,
        audit: AuditService,
        prisma: PrismaService,
      ) => new DistributeComponentUseCase(finalBoq, contractorBoq, buildings, ownership, audit, prisma),
      inject: [FINAL_BOQ_REPOSITORY, CONTRACTOR_BOQ_REPOSITORY, BUILDING_REPOSITORY, OwnershipService, AuditService, PrismaService],
    },
    {
      provide: DistributeItemUseCase,
      useFactory: (
        finalBoq: IFinalBoqRepository,
        contractorBoq: IContractorBoqRepository,
        buildings: IBuildingRepository,
        ownership: OwnershipService,
        audit: AuditService,
        prisma: PrismaService,
      ) => new DistributeItemUseCase(finalBoq, contractorBoq, buildings, ownership, audit, prisma),
      inject: [FINAL_BOQ_REPOSITORY, CONTRACTOR_BOQ_REPOSITORY, BUILDING_REPOSITORY, OwnershipService, AuditService, PrismaService],
    },
    {
      provide: RemoveDistributionUseCase,
      useFactory: (
        finalBoq: IFinalBoqRepository,
        contractorBoq: IContractorBoqRepository,
        buildings: IBuildingRepository,
        ownership: OwnershipService,
        audit: AuditService,
        prisma: PrismaService,
      ) => new RemoveDistributionUseCase(finalBoq, contractorBoq, buildings, ownership, audit, prisma),
      inject: [FINAL_BOQ_REPOSITORY, CONTRACTOR_BOQ_REPOSITORY, BUILDING_REPOSITORY, OwnershipService, AuditService, PrismaService],
    },
  ],
  exports: [DistributeComponentUseCase, DistributeItemUseCase, RemoveDistributionUseCase],
})
export class DistributionModule {}
