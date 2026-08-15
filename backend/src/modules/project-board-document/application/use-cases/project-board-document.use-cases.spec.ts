import { describe, expect, it, vi } from 'vitest';
import { ProjectBoardDocument } from '../../domain/project-board-document.entity';
import { CreateProjectBoardDocumentUseCase } from './create-project-board-document.use-case';
import { ListProjectBoardDocumentsUseCase } from './list-project-board-documents.use-case';
import { UpdateProjectBoardDocumentUseCase } from './update-project-board-document.use-case';
import { DeleteProjectBoardDocumentUseCase } from './delete-project-board-document.use-case';

function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    save: vi.fn(async () => undefined),
    findById: vi.fn(async () => null),
    findAllByBoard: vi.fn(async () => []),
    softDelete: vi.fn(async () => undefined),
    ...overrides,
  } as any;
}

function docOf(fileName: string, boardId = 'board-1') {
  return ProjectBoardDocument.create({ boardId, fileName }).getValue();
}

describe('CreateProjectBoardDocumentUseCase', () => {
  it('saves a valid document', async () => {
    const repo = makeRepo();
    const uc = new CreateProjectBoardDocumentUseCase(repo);

    const result = await uc.execute({
      boardId: 'board-1',
      fileName: 'drawing.pdf',
      mimeType: 'application/pdf',
      fileSize: 1000,
      description: 'مخطط',
      uploadedBy: 'user-1',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().fileName).toBe('drawing.pdf');
    expect(result.getValue().boardId).toBe('board-1');
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('fails validation without touching the repository', async () => {
    const repo = makeRepo();
    const uc = new CreateProjectBoardDocumentUseCase(repo);
    const result = await uc.execute({ boardId: 'board-1', fileName: '' });
    expect(result.isFailure).toBe(true);
    expect(repo.save).not.toHaveBeenCalled();
  });
});

describe('ListProjectBoardDocumentsUseCase', () => {
  it('lists by board when a boardId is given', async () => {
    const repo = makeRepo({ findAllByBoard: vi.fn(async () => [docOf('a.pdf')]) });
    const uc = new ListProjectBoardDocumentsUseCase(repo);
    const result = await uc.execute('board-9');
    expect(repo.findAllByBoard).toHaveBeenCalledWith('board-9');
    expect(result.getValue()).toHaveLength(1);
  });
});

describe('UpdateProjectBoardDocumentUseCase', () => {
  it('updates an existing document', async () => {
    const repo = makeRepo({ findById: vi.fn(async () => docOf('a.pdf')) });
    const uc = new UpdateProjectBoardDocumentUseCase(repo);
    const result = await uc.execute({ id: 'doc-1', description: 'v2', fileName: 'b.pdf' });
    expect(result.isSuccess).toBe(true);
    expect(result.getValue().fileName).toBe('b.pdf');
    expect(result.getValue().description).toBe('v2');
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('fails when the document is missing', async () => {
    const repo = makeRepo({ findById: vi.fn(async () => null) });
    const uc = new UpdateProjectBoardDocumentUseCase(repo);
    const result = await uc.execute({ id: 'doc-x', description: 'v2' });
    expect(result.isFailure).toBe(true);
    expect(result.error?.message).toContain('not found');
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('fails when the document was soft-deleted', async () => {
    const d = docOf('a.pdf');
    d.softDelete();
    const repo = makeRepo({ findById: vi.fn(async () => d) });
    const uc = new UpdateProjectBoardDocumentUseCase(repo);
    const result = await uc.execute({ id: 'doc-1', description: 'v2' });
    expect(result.isFailure).toBe(true);
  });
});

describe('DeleteProjectBoardDocumentUseCase', () => {
  it('soft-deletes an existing document', async () => {
    const d = docOf('a.pdf');
    const repo = makeRepo({ findById: vi.fn(async () => d) });
    const uc = new DeleteProjectBoardDocumentUseCase(repo);
    const result = await uc.execute('doc-1');
    expect(result.isSuccess).toBe(true);
    expect(d.isDeleted).toBe(true);
    expect(repo.softDelete).toHaveBeenCalledWith(d);
  });

  it('fails for a missing or already-deleted document', async () => {
    const repo = makeRepo({ findById: vi.fn(async () => null) });
    const uc = new DeleteProjectBoardDocumentUseCase(repo);
    expect((await uc.execute('doc-x')).isFailure).toBe(true);

    const d = docOf('a.pdf');
    d.softDelete();
    const repo2 = makeRepo({ findById: vi.fn(async () => d) });
    const uc2 = new DeleteProjectBoardDocumentUseCase(repo2);
    const result = await uc2.execute('doc-1');
    expect(result.isFailure).toBe(true);
    expect(repo2.softDelete).not.toHaveBeenCalled();
  });
});