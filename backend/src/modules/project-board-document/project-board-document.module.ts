import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PROJECT_BOARD_DOCUMENT_REPOSITORY } from './domain/project-board-document.repository';
import { IProjectBoardDocumentRepository } from './domain/project-board-document.repository';
import { PrismaProjectBoardDocumentRepository } from './infrastructure/prisma-project-board-document.repository';
import { ListProjectBoardDocumentsUseCase } from './application/use-cases/list-project-board-documents.use-case';
import { CreateProjectBoardDocumentUseCase } from './application/use-cases/create-project-board-document.use-case';
import { UpdateProjectBoardDocumentUseCase } from './application/use-cases/update-project-board-document.use-case';
import { DeleteProjectBoardDocumentUseCase } from './application/use-cases/delete-project-board-document.use-case';
import { ProjectBoardDocumentController } from './project-board-document.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ProjectBoardDocumentController],
  providers: [
    { provide: PROJECT_BOARD_DOCUMENT_REPOSITORY, useClass: PrismaProjectBoardDocumentRepository },
    {
      provide: ListProjectBoardDocumentsUseCase,
      useFactory: (repo: IProjectBoardDocumentRepository) => new ListProjectBoardDocumentsUseCase(repo),
      inject: [PROJECT_BOARD_DOCUMENT_REPOSITORY],
    },
    {
      provide: CreateProjectBoardDocumentUseCase,
      useFactory: (repo: IProjectBoardDocumentRepository) => new CreateProjectBoardDocumentUseCase(repo),
      inject: [PROJECT_BOARD_DOCUMENT_REPOSITORY],
    },
    {
      provide: UpdateProjectBoardDocumentUseCase,
      useFactory: (repo: IProjectBoardDocumentRepository) => new UpdateProjectBoardDocumentUseCase(repo),
      inject: [PROJECT_BOARD_DOCUMENT_REPOSITORY],
    },
    {
      provide: DeleteProjectBoardDocumentUseCase,
      useFactory: (repo: IProjectBoardDocumentRepository) => new DeleteProjectBoardDocumentUseCase(repo),
      inject: [PROJECT_BOARD_DOCUMENT_REPOSITORY],
    },
  ],
  exports: [PROJECT_BOARD_DOCUMENT_REPOSITORY],
})
export class ProjectBoardDocumentModule {}
