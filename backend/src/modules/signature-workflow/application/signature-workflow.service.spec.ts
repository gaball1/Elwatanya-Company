import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { SignatureWorkflowService } from './signature-workflow.service';
import { SignatureWorkflowRepository } from '../infrastructure/signature-workflow.repository';

const repo = {
  createWorkflow: vi.fn(),
  getWorkflows: vi.fn(),
  getWorkflow: vi.fn(),
  updateWorkflow: vi.fn(),
  deleteWorkflow: vi.fn(),
  createRequest: vi.fn(),
  getRequest: vi.fn(),
  getRequestByEntity: vi.fn(),
  updateAction: vi.fn(),
  updateRequest: vi.fn(),
  getPendingRequests: vi.fn(),
  getCurrentAction: vi.fn(),
} as unknown as SignatureWorkflowRepository;

const service = new SignatureWorkflowService(repo);

function makeRequest(currentStep = 1, status = 'in_progress') {
  return {
    id: 'req-1',
    workflowId: 'wf-1',
    entityType: 'PURCHASE',
    entityId: 'p-1',
    status,
    currentStep,
    actions: [
      { id: 'a-1', stepOrder: 1, status: 'pending', stepUserId: 'user-1', roleName: null },
      { id: 'a-2', stepOrder: 2, status: 'pending', stepUserId: null, roleName: 'MANAGER' },
      { id: 'a-3', stepOrder: 3, status: 'pending', stepUserId: null, roleName: null },
    ],
  };
}

function makeWorkflow() {
  return {
    id: 'wf-1',
    isActive: true,
    steps: [
      { id: 's-1', stepOrder: 1, roleName: null, userId: 'user-1', isFinal: false },
      { id: 's-2', stepOrder: 2, roleName: 'MANAGER', userId: null, isFinal: true },
      { id: 's-3', stepOrder: 3, roleName: null, userId: null, isFinal: false },
    ],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SignatureWorkflowService.sign authorization', () => {
  it('allows the exact user assigned to the step (step.userId)', async () => {
    (repo.getRequest as any).mockResolvedValue(makeRequest(1));
    (repo.getWorkflow as any).mockResolvedValue(makeWorkflow());
    await expect(
      service.sign('req-1', { sub: 'user-1', role: 'USER', roleNames: ['USER'] }, 'signed'),
    ).resolves.toMatchObject({ status: 'in_progress', nextStep: 2 });
    expect(repo.updateAction).toHaveBeenCalledWith(
      'a-1',
      expect.objectContaining({ signedBy: 'user-1', status: 'signed' }),
    );
  });

  it('allows a member of the step role via roleNames', async () => {
    (repo.getRequest as any).mockResolvedValue(makeRequest(2));
    (repo.getWorkflow as any).mockResolvedValue(makeWorkflow());
    await expect(
      service.sign('req-1', { sub: 'user-9', role: 'USER', roleNames: ['MANAGER'] }, 'signed'),
    ).resolves.toMatchObject({ status: 'completed' });
  });

  it('allows a member of the step role via legacy user.role', async () => {
    (repo.getRequest as any).mockResolvedValue(makeRequest(2));
    (repo.getWorkflow as any).mockResolvedValue(makeWorkflow());
    await expect(
      service.sign('req-1', { sub: 'user-9', role: 'MANAGER', roleNames: [] }, 'signed'),
    ).resolves.toMatchObject({ status: 'completed' });
  });

  it('denies a user who is not assigned to the current step', async () => {
    (repo.getRequest as any).mockResolvedValue(makeRequest(1));
    (repo.getWorkflow as any).mockResolvedValue(makeWorkflow());
    await expect(
      service.sign('req-1', { sub: 'attacker', role: 'USER', roleNames: ['USER'] }, 'signed'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.updateAction).not.toHaveBeenCalled();
  });

  it('denies signing a step that has no assignee (fail-closed)', async () => {
    (repo.getRequest as any).mockResolvedValue(makeRequest(3));
    (repo.getWorkflow as any).mockResolvedValue(makeWorkflow());
    await expect(
      service.sign('req-1', { sub: 'user-1', role: 'CEO', roleNames: ['CEO'] }, 'signed'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.updateAction).not.toHaveBeenCalled();
  });

  it('denies signing a completed request', async () => {
    (repo.getRequest as any).mockResolvedValue(makeRequest(1, 'completed'));
    await expect(
      service.sign('req-1', { sub: 'user-1', roleNames: ['USER'] }, 'signed'),
    ).rejects.toThrow('already completed');
  });

  it('marks the request rejected when a step rejects', async () => {
    (repo.getRequest as any).mockResolvedValue(makeRequest(1));
    (repo.getWorkflow as any).mockResolvedValue(makeWorkflow());
    await expect(
      service.sign('req-1', { sub: 'user-1', roleNames: ['USER'] }, 'rejected', 'not ok'),
    ).resolves.toMatchObject({ status: 'rejected' });
    expect(repo.updateRequest).toHaveBeenCalledWith(
      'req-1',
      expect.objectContaining({ status: 'rejected' }),
    );
  });
});
