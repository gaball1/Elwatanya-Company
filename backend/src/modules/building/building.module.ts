import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { ProjectModule } from '@/modules/project/project.module';
import { OwnershipService } from '@/common/services/ownership.service';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { PROJECT_REPOSITORY } from '@/modules/project/domain/project.repository';
import { BUILDING_REPOSITORY } from './domain/building.repository';
import { PrismaBuildingRepository } from './infrastructure/prisma-building.repository';
import { CreateBuildingUseCase } from './application/use-cases/create-building.use-case';
import { UpdateBuildingUseCase } from './application/use-cases/update-building.use-case';
import { GetBuildingUseCase } from './application/use-cases/get-building.use-case';
import { ListBuildingsByProjectUseCase } from './application/use-cases/list-buildings-by-project.use-case';
import { SoftDeleteBuildingUseCase } from './application/use-cases/soft-delete-building.use-case';
import { BuildingController } from './building.controller';
import { IProjectRepository } from '@/modules/project/domain/project.repository';

@Module({
  imports: [PrismaModule, ProjectModule],
  controllers: [BuildingController],
  providers: [
    { provide: BUILDING_REPOSITORY, useClass: PrismaBuildingRepository },
    {
      provide: OwnershipService,
      useFactory: (prisma: PrismaService) => new OwnershipService(prisma),
      inject: [PrismaService],
    },
    {
      provide: CreateBuildingUseCase,
      useFactory: (
        buildings: PrismaBuildingRepository,
        projects: IProjectRepository,
        ownership: OwnershipService,
        prisma: PrismaService,
        eventBus: EventBusImpl,
      ) => new CreateBuildingUseCase(buildings, projects, ownership, eventBus),
      inject: [BUILDING_REPOSITORY, PROJECT_REPOSITORY, OwnershipService, PrismaService, EventBusImpl],
    },
    {
      provide: UpdateBuildingUseCase,
      useFactory: (buildings: PrismaBuildingRepository, ownership: OwnershipService) =>
        new UpdateBuildingUseCase(buildings, ownership),
      inject: [BUILDING_REPOSITORY, OwnershipService],
    },
    {
      provide: GetBuildingUseCase,
      useFactory: (buildings: PrismaBuildingRepository, ownership: OwnershipService) =>
        new GetBuildingUseCase(buildings, ownership),
      inject: [BUILDING_REPOSITORY, OwnershipService],
    },
    {
      provide: ListBuildingsByProjectUseCase,
      useFactory: (
        buildings: PrismaBuildingRepository,
        projects: IProjectRepository,
        ownership: OwnershipService,
      ) => new ListBuildingsByProjectUseCase(buildings, projects, ownership),
      inject: [BUILDING_REPOSITORY, PROJECT_REPOSITORY, OwnershipService],
    },
    {
      provide: SoftDeleteBuildingUseCase,
      useFactory: (buildings: PrismaBuildingRepository, ownership: OwnershipService) =>
        new SoftDeleteBuildingUseCase(buildings, ownership),
      inject: [BUILDING_REPOSITORY, OwnershipService],
    },
  ],
  exports: [BUILDING_REPOSITORY, GetBuildingUseCase],
})
export class BuildingModule {}
