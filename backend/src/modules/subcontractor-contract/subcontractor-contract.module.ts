import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { NotificationService } from '@/common/services/notification.service';
import { SUBCONTRACTOR_CONTRACT_REPOSITORY } from './domain/subcontractor-contract.repository';
import { ISubcontractorContractRepository } from './domain/subcontractor-contract.repository';
import { PrismaSubcontractorContractRepository } from './infrastructure/prisma-subcontractor-contract.repository';
import {
  CreateSubcontractorContractUseCase,
  UpdateSubcontractorContractUseCase,
  DeleteSubcontractorContractUseCase,
  ListSubcontractorContractsUseCase,
  GetSubcontractorContractUseCase,
} from './application/use-cases/subcontractor-contract.use-cases';
import { SubcontractorContractController } from './subcontractor-contract.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SubcontractorContractController],
  providers: [
    {
      provide: SUBCONTRACTOR_CONTRACT_REPOSITORY,
      useClass: PrismaSubcontractorContractRepository,
    },
    {
      provide: ListSubcontractorContractsUseCase,
      useFactory: (repo: ISubcontractorContractRepository) =>
        new ListSubcontractorContractsUseCase(repo),
      inject: [SUBCONTRACTOR_CONTRACT_REPOSITORY],
    },
    {
      provide: GetSubcontractorContractUseCase,
      useFactory: (repo: ISubcontractorContractRepository) =>
        new GetSubcontractorContractUseCase(repo),
      inject: [SUBCONTRACTOR_CONTRACT_REPOSITORY],
    },
    {
      provide: CreateSubcontractorContractUseCase,
      useFactory: (repo: ISubcontractorContractRepository, notifications: NotificationService) =>
        new CreateSubcontractorContractUseCase(repo, notifications),
      inject: [SUBCONTRACTOR_CONTRACT_REPOSITORY, NotificationService],
    },
    {
      provide: UpdateSubcontractorContractUseCase,
      useFactory: (repo: ISubcontractorContractRepository) =>
        new UpdateSubcontractorContractUseCase(repo),
      inject: [SUBCONTRACTOR_CONTRACT_REPOSITORY],
    },
    {
      provide: DeleteSubcontractorContractUseCase,
      useFactory: (repo: ISubcontractorContractRepository) =>
        new DeleteSubcontractorContractUseCase(repo),
      inject: [SUBCONTRACTOR_CONTRACT_REPOSITORY],
    },
  ],
  exports: [SUBCONTRACTOR_CONTRACT_REPOSITORY],
})
export class SubcontractorContractModule {}
