import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { BuildingModule } from '@/modules/building/building.module';
import { FinalBoqModule } from '@/modules/final-boq/final-boq.module';
import { ContractorBoqModule } from '@/modules/contractor-boq/contractor-boq.module';
import { BUILDING_REPOSITORY } from '@/modules/building/domain/building.repository';
import { IBuildingRepository } from '@/modules/building/domain/building.repository';
import { FINAL_BOQ_REPOSITORY } from '@/modules/final-boq/domain/final-boq.repository';
import { IFinalBoqRepository } from '@/modules/final-boq/domain/final-boq.repository';
import { CONTRACTOR_BOQ_REPOSITORY } from '@/modules/contractor-boq/domain/contractor-boq.repository';
import { IContractorBoqRepository } from '@/modules/contractor-boq/domain/contractor-boq.repository';
import { DistributeComponentUseCase } from './application/use-cases/distribute-component.use-case';
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
      provide: DistributeComponentUseCase,
      useFactory: (
        finalBoq: IFinalBoqRepository,
        contractorBoq: IContractorBoqRepository,
        buildings: IBuildingRepository,
      ) => new DistributeComponentUseCase(finalBoq, contractorBoq, buildings),
      inject: [FINAL_BOQ_REPOSITORY, CONTRACTOR_BOQ_REPOSITORY, BUILDING_REPOSITORY],
    },
  ],
  exports: [DistributeComponentUseCase],
})
export class DistributionModule {}
