import { Result } from '@/shared/kernel/result';
import { IProjectBoardDocumentRepository } from '../../domain/project-board-document.repository';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export class DeleteProjectBoardDocumentUseCase {
  constructor(private readonly docs: IProjectBoardDocumentRepository) {}

  async execute(id: string): Promise<Result<void>> {
    const existing = await this.docs.findById(new UniqueEntityId(id));
    if (!existing) return Result.fail(new Error('Board document not found'));
    if (existing.isDeleted) return Result.fail(new Error('Board document is already deleted'));

    const del = existing.softDelete();
    if (del.isFailure) return Result.fail(del.error as Error);

    await this.docs.softDelete(existing);
    return Result.ok();
  }
}