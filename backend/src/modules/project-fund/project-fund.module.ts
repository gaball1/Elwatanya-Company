import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { OwnershipService } from '@/common/services/ownership.service';
import { PROJECT_FUND_REPOSITORY } from './domain/project-fund.repository';
import { IProjectFundRepository } from './domain/project-fund.repository';
import { PrismaProjectFundRepository } from './infrastructure/prisma-project-fund.repository';
import { ListProjectFundsUseCase } from './application/use-cases/list-project-funds.use-case';
import { GetProjectFundByProjectIdUseCase } from './application/use-cases/get-project-fund-by-project-id.use-case';
import { CreateProjectFundUseCase } from './application/use-cases/create-project-fund.use-case';
import { UpdateProjectFundUseCase } from './application/use-cases/update-project-fund.use-case';
import { DeleteProjectFundUseCase } from './application/use-cases/delete-project-fund.use-case';
import { ProjectFundController } from './project-fund.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ProjectFundController],
  providers: [
    {
      provide: OwnershipService,
      useFactory: (prisma: PrismaService) => new OwnershipService(prisma),
      inject: [PrismaService],
    },
    { provide: PROJECT_FUND_REPOSITORY, useClass: PrismaProjectFundRepository },
    {
      provide: ListProjectFundsUseCase,
      useFactory: (repo: IProjectFundRepository, ownership: OwnershipService) => new ListProjectFundsUseCase(repo, ownership),
      inject: [PROJECT_FUND_REPOSITORY, OwnershipService],
    },
    {
      provide: GetProjectFundByProjectIdUseCase,
      useFactory: (repo: IProjectFundRepository, ownership: OwnershipService) => new GetProjectFundByProjectIdUseCase(repo, ownership),
      inject: [PROJECT_FUND_REPOSITORY, OwnershipService],
    },
    {
      provide: CreateProjectFundUseCase,
      useFactory: (repo: IProjectFundRepository, ownership: OwnershipService) => new CreateProjectFundUseCase(repo, ownership),
      inject: [PROJECT_FUND_REPOSITORY, OwnershipService],
    },
    {
      provide: UpdateProjectFundUseCase,
      useFactory: (repo: IProjectFundRepository, ownership: OwnershipService) => new UpdateProjectFundUseCase(repo, ownership),
      inject: [PROJECT_FUND_REPOSITORY, OwnershipService],
    },
    {
      provide: DeleteProjectFundUseCase,
      useFactory: (repo: IProjectFundRepository, ownership: OwnershipService) => new DeleteProjectFundUseCase(repo, ownership),
      inject: [PROJECT_FUND_REPOSITORY, OwnershipService],
    },
  ],
  exports: [PROJECT_FUND_REPOSITORY],
})
export class ProjectFundModule {}
