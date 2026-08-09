import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PROJECT_FUND_REPOSITORY } from './domain/project-fund.repository';
import { IProjectFundRepository } from './domain/project-fund.repository';
import { PrismaProjectFundRepository } from './infrastructure/prisma-project-fund.repository';
import { ListProjectFundsUseCase } from './application/use-cases/list-project-funds.use-case';
import { CreateProjectFundUseCase } from './application/use-cases/create-project-fund.use-case';
import { UpdateProjectFundUseCase } from './application/use-cases/update-project-fund.use-case';
import { DeleteProjectFundUseCase } from './application/use-cases/delete-project-fund.use-case';
import { ProjectFundController } from './project-fund.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ProjectFundController],
  providers: [
    { provide: PROJECT_FUND_REPOSITORY, useClass: PrismaProjectFundRepository },
    {
      provide: ListProjectFundsUseCase,
      useFactory: (repo: IProjectFundRepository) => new ListProjectFundsUseCase(repo),
      inject: [PROJECT_FUND_REPOSITORY],
    },
    {
      provide: CreateProjectFundUseCase,
      useFactory: (repo: IProjectFundRepository) => new CreateProjectFundUseCase(repo),
      inject: [PROJECT_FUND_REPOSITORY],
    },
    {
      provide: UpdateProjectFundUseCase,
      useFactory: (repo: IProjectFundRepository) => new UpdateProjectFundUseCase(repo),
      inject: [PROJECT_FUND_REPOSITORY],
    },
    {
      provide: DeleteProjectFundUseCase,
      useFactory: (repo: IProjectFundRepository) => new DeleteProjectFundUseCase(repo),
      inject: [PROJECT_FUND_REPOSITORY],
    },
  ],
  exports: [PROJECT_FUND_REPOSITORY],
})
export class ProjectFundModule {}
