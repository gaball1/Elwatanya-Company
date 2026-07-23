import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PROJECT_REPOSITORY } from './domain/project.repository';
import { PrismaProjectRepository } from './infrastructure/prisma-project.repository';
import { CreateProjectUseCase } from './application/use-cases/create-project.use-case';
import { UpdateProjectUseCase } from './application/use-cases/update-project.use-case';
import { GetProjectUseCase } from './application/use-cases/get-project.use-case';
import { ListProjectsUseCase } from './application/use-cases/list-projects.use-case';
import { SoftDeleteProjectUseCase } from './application/use-cases/soft-delete-project.use-case';
import { ProjectController } from './project.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ProjectController],
  providers: [
    { provide: PROJECT_REPOSITORY, useClass: PrismaProjectRepository },
    {
      provide: CreateProjectUseCase,
      useFactory: (projects: PrismaProjectRepository) => new CreateProjectUseCase(projects),
      inject: [PROJECT_REPOSITORY],
    },
    {
      provide: UpdateProjectUseCase,
      useFactory: (projects: PrismaProjectRepository) => new UpdateProjectUseCase(projects),
      inject: [PROJECT_REPOSITORY],
    },
    {
      provide: GetProjectUseCase,
      useFactory: (projects: PrismaProjectRepository) => new GetProjectUseCase(projects),
      inject: [PROJECT_REPOSITORY],
    },
    {
      provide: ListProjectsUseCase,
      useFactory: (projects: PrismaProjectRepository) => new ListProjectsUseCase(projects),
      inject: [PROJECT_REPOSITORY],
    },
    {
      provide: SoftDeleteProjectUseCase,
      useFactory: (projects: PrismaProjectRepository) =>
        new SoftDeleteProjectUseCase(projects),
      inject: [PROJECT_REPOSITORY],
    },
  ],
  exports: [PROJECT_REPOSITORY, GetProjectUseCase],
})
export class ProjectModule {}
