import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { ProjectBoard } from './project-board.entity';

export const PROJECT_BOARD_REPOSITORY = Symbol('PROJECT_BOARD_REPOSITORY');

export interface IProjectBoardRepository {
  save(board: ProjectBoard): Promise<void>;
  findById(id: UniqueEntityId): Promise<ProjectBoard | null>;
  findAll(): Promise<ProjectBoard[]>;
}
