import { describe, expect, it, vi } from 'vitest';
import { ListApprovalsUseCase } from './list-approvals.use-case';
import { IApprovalRepository } from '../../domain/approval.repository';

function makeRepo(overrides: Partial<IApprovalRepository> = {}): IApprovalRepository {
  return {
    findMany: vi.fn(async () => []),
    findById: vi.fn(async () => null),
    findByEntity: vi.fn(async () => null),
    create: vi.fn(async () => null as any),
    reset: vi.fn(async () => null as any),
    update: vi.fn(async () => null as any),
    transition: vi.fn(async () => null),
    count: vi.fn(async () => 0),
    ...overrides,
  } as IApprovalRepository;
}

describe('ListApprovalsUseCase scoping', () => {
  it('scopes to the requesting user when the viewer is not an admin', async () => {
    const repo = makeRepo();
    const useCase = new ListApprovalsUseCase(repo);

    await useCase.execute({}, { userId: 'user-1', isAdmin: false });

    expect(repo.findMany).toHaveBeenCalledWith({ requestedBy: 'user-1' });
    expect(repo.count).toHaveBeenCalledWith({ requestedBy: 'user-1' });
  });

  it('returns the full list for an admin', async () => {
    const repo = makeRepo();
    const useCase = new ListApprovalsUseCase(repo);

    await useCase.execute({ status: 'pending' }, { userId: 'user-1', isAdmin: true });

    expect(repo.findMany).toHaveBeenCalledWith({ status: 'pending' });
    expect(repo.findMany).not.toHaveBeenCalledWith(expect.objectContaining({ requestedBy: expect.any(String) }));
    expect(repo.count).toHaveBeenCalledWith({ status: 'pending' });
  });

  it('keeps filters combined with the requester scoping', async () => {
    const repo = makeRepo();
    const useCase = new ListApprovalsUseCase(repo);

    await useCase.execute({ entityType: 'leave', take: 10 }, { userId: 'user-9', isAdmin: false });

    expect(repo.findMany).toHaveBeenCalledWith({ entityType: 'leave', take: 10, requestedBy: 'user-9' });
  });
});
