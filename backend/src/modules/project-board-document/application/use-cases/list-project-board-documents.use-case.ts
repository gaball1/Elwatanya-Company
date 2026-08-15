import { Result } from '@/shared/kernel/result';
import { ProjectBoardDocument } from '../../domain/project-board-document.entity';
import { ProjectBoardDocumentResult } from '../dto/project-board-document.dto';

export function toResult(d: ProjectBoardDocument): ProjectBoardDocumentResult {
  return {
    id: d.id.toValue(),
    boardId: d.boardId,
    fileId: d.fileId,
    fileName: d.fileName,
    mimeType: d.mimeType,
    fileSize: d.fileSize,
    description: d.description,
    uploadedBy: d.uploadedBy,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export class ListProjectBoardDocumentsUseCase {
  constructor(
    private readonly docs: import('../../domain/project-board-document.repository').IProjectBoardDocumentRepository,
  ) {}

  async execute(boardId?: string): Promise<Result<ProjectBoardDocumentResult[]>> {
    const list = boardId
      ? await this.docs.findAllByBoard(boardId)
      : await this.docs.findAllByBoard('');
    return Result.ok(list.map(toResult));
  }
}