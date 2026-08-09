import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IProjectBoardRepository } from '../../domain/project-board.repository';

export class DeleteProjectBoardUseCase {
  constructor(private readonly boards: IProjectBoardRepository) {}

  async execute(id: string): Promise<Result<void>> {
    const board = await this.boards.findById(new UniqueEntityId(id));
    if (!board) return Result.fail(new Error('Project board not found'));

    const deleteResult = board.softDelete();
    if (deleteResult.isFailure) return Result.fail(deleteResult.error as Error);

    await this.boards.save(board);
    return Result.ok();
  }
}
