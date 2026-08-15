import { describe, expect, it } from 'vitest';
import { ProjectBoardDocument } from './project-board-document.entity';

describe('ProjectBoardDocument.create', () => {
  it('creates a document with sensible defaults', () => {
    const r = ProjectBoardDocument.create({ boardId: 'board-1', fileName: '  plan-A1.pdf  ' });
    expect(r.isSuccess).toBe(true);
    const d = r.getValue();
    expect(d.boardId).toBe('board-1');
    expect(d.fileName).toBe('plan-A1.pdf'); // trimmed
    expect(d.mimeType).toBe('application/octet-stream');
    expect(d.fileSize).toBe(0);
    expect(d.description).toBe('');
    expect(d.uploadedBy).toBeNull();
    expect(d.isDeleted).toBe(false);
  });

  it('keeps provided metadata', () => {
    const d = ProjectBoardDocument.create({
      boardId: 'board-1',
      fileName: 'x.pdf',
      mimeType: 'application/pdf',
      fileSize: 245760,
      description: 'لوحة صب الخرسانة',
      uploadedBy: 'user-1',
      fileId: 'file-1',
    }).getValue();
    expect(d.fileId).toBe('file-1');
    expect(d.mimeType).toBe('application/pdf');
    expect(d.fileSize).toBe(245760);
    expect(d.description).toBe('لوحة صب الخرسانة');
    expect(d.uploadedBy).toBe('user-1');
  });

  it('rejects null boardId or empty/blank fileName', () => {
    expect(ProjectBoardDocument.create({ boardId: null as any, fileName: 'x.pdf' }).isFailure).toBe(true);
    expect(ProjectBoardDocument.create({ boardId: 'b', fileName: '' }).isFailure).toBe(true);
    expect(ProjectBoardDocument.create({ boardId: 'b', fileName: '   ' }).isFailure).toBe(true);
  });
});

describe('ProjectBoardDocument.update', () => {
  it('updates metadata and trims file names', () => {
    const d = ProjectBoardDocument.create({ boardId: 'b', fileName: 'a.pdf' }).getValue();
    expect(d.update({ fileName: ' new.pdf ', fileSize: 10, description: 'd' }).isSuccess).toBe(true);
    expect(d.fileName).toBe('new.pdf');
    expect(d.fileSize).toBe(10);
  });

  it('rejects empty file names and negative sizes', () => {
    const d = ProjectBoardDocument.create({ boardId: 'b', fileName: 'a.pdf' }).getValue();
    expect(d.update({ fileName: '  ' }).isFailure).toBe(true);
    expect(d.update({ fileSize: -1 }).isFailure).toBe(true);
  });

  it('rejects updates after soft delete', () => {
    const d = ProjectBoardDocument.create({ boardId: 'b', fileName: 'a.pdf' }).getValue();
    d.softDelete();
    expect(d.isDeleted).toBe(true);
    expect(d.update({ fileName: 'b.pdf' }).isFailure).toBe(true);
    expect(d.softDelete().isFailure).toBe(true); // idempotence guard
  });
});

describe('ProjectBoardDocument.softDelete', () => {
  it('is idempotence-safe', () => {
    const d = ProjectBoardDocument.create({ boardId: 'b', fileName: 'a.pdf' }).getValue();
    expect(d.softDelete().isSuccess).toBe(true);
    expect(d.deletedAt).toBeTruthy();
    expect(d.softDelete().isFailure).toBe(true);
  });
});