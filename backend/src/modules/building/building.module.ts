import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { ProjectModule } from '@/modules/project/project.module';
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
      provide: CreateBuildingUseCase,
      useFactory: (
        buildings: PrismaBuildingRepository,
        projects: IProjectRepository,
      ) => new CreateBuildingUseCase(buildings, projects),
      inject: [BUILDING_REPOSITORY, PROJECT_REPOSITORY],
    },
    {
      provide: UpdateBuildingUseCase,
      useFactory: (buildings: PrismaBuildingRepository) =>
        new UpdateBuildingUseCase(buildings),
      inject: [BUILDING_REPOSITORY],
    },
    {
      provide: GetBuildingUseCase,
      useFactory: (buildings: PrismaBuildingRepository) =>
        new GetBuildingUseCase(buildings),
      inject: [BUILDING_REPOSITORY],
    },
    {
      provide: ListBuildingsByProjectUseCase,
      useFactory: (
        buildings: PrismaBuildingRepository,
        projects: IProjectRepository,
      ) => new ListBuildingsByProjectUseCase(buildings, projects),
      inject: [BUILDING_REPOSITORY, PROJECT_REPOSITORY],
    },
    {
      provide: SoftDeleteBuildingUseCase,
      useFactory: (buildings: PrismaBuildingRepository) =>
        new SoftDeleteBuildingUseCase(buildings),
      inject: [BUILDING_REPOSITORY],
    },
  ],
  exports: [BUILDING_REPOSITORY, GetBuildingUseCase],
})
export class BuildingModule {}
