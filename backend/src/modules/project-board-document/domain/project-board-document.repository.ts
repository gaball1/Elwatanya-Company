import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { ProjectBoardDocument } from './project-board-document.entity';

export const PROJECT_BOARD_DOCUMENT_REPOSITORY = Symbol('PROJECT_BOARD_DOCUMENT_REPOSITORY');

export interface IProjectBoardDocumentRepository {
  save(doc: ProjectBoardDocument): Promise<void>;
  findById(id: UniqueEntityId): Promise<ProjectBoardDocument | null>;
  findAllByBoard(boardId: string): Promise<ProjectBoardDocument[]>;
  softDelete(doc: ProjectBoardDocument): Promise<void>;
}