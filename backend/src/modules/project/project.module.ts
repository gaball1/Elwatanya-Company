import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { OwnershipService } from '@/common/services/ownership.service';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { PROJECT_REPOSITORY } from './domain/project.repository';
import { PrismaProjectRepository } from './infrastructure/prisma-project.repository';
import { CreateProjectUseCase } from './application/use-cases/create-project.use-case';
import { UpdateProjectUseCase } from './application/use-cases/update-project.use-case';
import { GetProjectUseCase } from './application/use-cases/get-project.use-case';
import { ListProjectsUseCase } from './application/use-cases/list-projects.use-case';
import { SoftDeleteProjectUseCase } from './application/use-cases/soft-delete-project.use-case';
import { ProjectDashboardService } from './project-dashboard.service';
import { ProjectController } from './project.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ProjectController],
  providers: [
    {
      provide: ProjectDashboardService,
      useFactory: (prisma: PrismaService) => new ProjectDashboardService(prisma),
      inject: [PrismaService],
    },
    { provide: PROJECT_REPOSITORY, useClass: PrismaProjectRepository },
    {
      provide: OwnershipService,
      useFactory: (prisma: PrismaService) => new OwnershipService(prisma),
      inject: [PrismaService],
    },
    {
      provide: CreateProjectUseCase,
      useFactory: (projects: PrismaProjectRepository, eventBus: EventBusImpl) =>
        new CreateProjectUseCase(projects, eventBus),
      inject: [PROJECT_REPOSITORY, EventBusImpl],
    },
    {
      provide: UpdateProjectUseCase,
      useFactory: (projects: PrismaProjectRepository, ownership: OwnershipService, eventBus: EventBusImpl) =>
        new UpdateProjectUseCase(projects, ownership, eventBus),
      inject: [PROJECT_REPOSITORY, OwnershipService, EventBusImpl],
    },
    {
      provide: GetProjectUseCase,
      useFactory: (projects: PrismaProjectRepository, ownership: OwnershipService) =>
        new GetProjectUseCase(projects, ownership),
      inject: [PROJECT_REPOSITORY, OwnershipService],
    },
    {
      provide: ListProjectsUseCase,
      useFactory: (projects: PrismaProjectRepository, ownership: OwnershipService) =>
        new ListProjectsUseCase(projects, ownership),
      inject: [PROJECT_REPOSITORY, OwnershipService],
    },
    {
      provide: SoftDeleteProjectUseCase,
      useFactory: (projects: PrismaProjectRepository, ownership: OwnershipService) =>
        new SoftDeleteProjectUseCase(projects, ownership),
      inject: [PROJECT_REPOSITORY, OwnershipService],
    },
  ],
  exports: [PROJECT_REPOSITORY, GetProjectUseCase, ProjectDashboardService],
})
export class ProjectModule {}
