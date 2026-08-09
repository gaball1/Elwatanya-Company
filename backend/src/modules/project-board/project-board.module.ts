import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PROJECT_BOARD_REPOSITORY } from './domain/project-board.repository';
import { IProjectBoardRepository } from './domain/project-board.repository';
import { PrismaProjectBoardRepository } from './infrastructure/prisma-project-board.repository';
import { ListProjectBoardsUseCase } from './application/use-cases/list-project-boards.use-case';
import { CreateProjectBoardUseCase } from './application/use-cases/create-project-board.use-case';
import { UpdateProjectBoardUseCase } from './application/use-cases/update-project-board.use-case';
import { DeleteProjectBoardUseCase } from './application/use-cases/delete-project-board.use-case';
import { ProjectBoardController } from './project-board.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ProjectBoardController],
  providers: [
    { provide: PROJECT_BOARD_REPOSITORY, useClass: PrismaProjectBoardRepository },
    {
      provide: ListProjectBoardsUseCase,
      useFactory: (repo: IProjectBoardRepository) => new ListProjectBoardsUseCase(repo),
      inject: [PROJECT_BOARD_REPOSITORY],
    },
    {
      provide: CreateProjectBoardUseCase,
      useFactory: (repo: IProjectBoardRepository) => new CreateProjectBoardUseCase(repo),
      inject: [PROJECT_BOARD_REPOSITORY],
    },
    {
      provide: UpdateProjectBoardUseCase,
      useFactory: (repo: IProjectBoardRepository) => new UpdateProjectBoardUseCase(repo),
      inject: [PROJECT_BOARD_REPOSITORY],
    },
    {
      provide: DeleteProjectBoardUseCase,
      useFactory: (repo: IProjectBoardRepository) => new DeleteProjectBoardUseCase(repo),
      inject: [PROJECT_BOARD_REPOSITORY],
    },
  ],
  exports: [PROJECT_BOARD_REPOSITORY],
})
export class ProjectBoardModule {}
