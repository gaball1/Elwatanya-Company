import { Result } from '@/shared/kernel/result';
import { ProjectBoard } from '../../domain/project-board.entity';
import { ProjectBoardResult } from '../dto/project-board.dto';

export function toResult(b: ProjectBoard): ProjectBoardResult {
  return {
    id: b.id.toValue(),
    buildingId: b.buildingId,
    name: b.name,
    description: b.description,
    image: b.image,
    date: b.date,
    createdBy: b.createdBy,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

export class ListProjectBoardsUseCase {
  constructor(private readonly boards: import('../../domain/project-board.repository').IProjectBoardRepository) {}

  async execute(): Promise<Result<ProjectBoardResult[]>> {
    const list = await this.boards.findAll();
    return Result.ok(list.map(toResult));
  }
}
