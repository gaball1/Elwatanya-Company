import { Result } from '@/shared/kernel/result';
import { IProjectBoardDocumentRepository } from '../../domain/project-board-document.repository';
import { UpdateProjectBoardDocumentInput, ProjectBoardDocumentResult } from '../dto/project-board-document.dto';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { toResult } from './list-project-board-documents.use-case';

export class UpdateProjectBoardDocumentUseCase {
  constructor(private readonly docs: IProjectBoardDocumentRepository) {}

  async execute(input: UpdateProjectBoardDocumentInput): Promise<Result<ProjectBoardDocumentResult>> {
    const existing = await this.docs.findById(new UniqueEntityId(input.id));
    if (!existing) return Result.fail(new Error('Board document not found'));
    if (existing.isDeleted) return Result.fail(new Error('Board document is deleted'));

    const update = existing.update({
      fileName: input.fileName,
      fileId: input.fileId,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      description: input.description,
    });
    if (update.isFailure) return Result.fail(update.error as Error);

    await this.docs.save(existing);
    return Result.ok(toResult(existing));
  }
}