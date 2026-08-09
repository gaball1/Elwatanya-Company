import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IProjectBoardRepository } from '../../domain/project-board.repository';
import { UpdateProjectBoardInput, ProjectBoardResult } from '../dto/project-board.dto';
import { toResult } from './list-project-boards.use-case';

export class UpdateProjectBoardUseCase {
  constructor(private readonly boards: IProjectBoardRepository) {}

  async execute(input: UpdateProjectBoardInput): Promise<Result<ProjectBoardResult>> {
    const board = await this.boards.findById(new UniqueEntityId(input.id));
    if (!board) return Result.fail(new Error('Project board not found'));

    const updateResult = board.update({
      buildingId: input.buildingId,
      name: input.name,
      description: input.description,
      image: input.image,
      date: input.date,
      createdBy: input.createdBy,
    });

    if (updateResult.isFailure) return Result.fail(updateResult.error as Error);

    await this.boards.save(board);
    return Result.ok(toResult(board));
  }
}
