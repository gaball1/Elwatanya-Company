import { Result } from '@/shared/kernel/result';
import { IProjectBoardRepository } from '../../domain/project-board.repository';
import { CreateProjectBoardInput, ProjectBoardResult } from '../dto/project-board.dto';
import { ProjectBoard } from '../../domain/project-board.entity';
import { toResult } from './list-project-boards.use-case';

export class CreateProjectBoardUseCase {
  constructor(private readonly boards: IProjectBoardRepository) {}

  async execute(input: CreateProjectBoardInput): Promise<Result<ProjectBoardResult>> {
    const result = ProjectBoard.create({
      buildingId: input.buildingId,
      name: input.name,
      description: input.description,
      image: input.image,
      date: input.date,
      createdBy: input.createdBy,
    });

    if (result.isFailure) return Result.fail(result.error as Error);

    const board = result.getValue();
    await this.boards.save(board);
    return Result.ok(toResult(board));
  }
}
