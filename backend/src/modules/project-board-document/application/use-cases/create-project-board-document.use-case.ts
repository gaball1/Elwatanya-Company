import { Result } from '@/shared/kernel/result';
import { IProjectBoardDocumentRepository } from '../../domain/project-board-document.repository';
import { CreateProjectBoardDocumentInput, ProjectBoardDocumentResult } from '../dto/project-board-document.dto';
import { ProjectBoardDocument } from '../../domain/project-board-document.entity';
import { toResult } from './list-project-board-documents.use-case';

export class CreateProjectBoardDocumentUseCase {
  constructor(private readonly docs: IProjectBoardDocumentRepository) {}

  async execute(input: CreateProjectBoardDocumentInput): Promise<Result<ProjectBoardDocumentResult>> {
    const result = ProjectBoardDocument.create({
      boardId: input.boardId,
      fileName: input.fileName,
      fileId: input.fileId,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      description: input.description,
      uploadedBy: input.uploadedBy,
    });

    if (result.isFailure) return Result.fail(result.error as Error);

    const doc = result.getValue();
    await this.docs.save(doc);
    return Result.ok(toResult(doc));
  }
}