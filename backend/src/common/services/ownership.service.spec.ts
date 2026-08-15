import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { OwnershipService } from './ownership.service';

function makeService(buildingProjectId?: string) {
  const prisma = {
    building: {
      findUnique: vi.fn().mockResolvedValue(buildingProjectId ? { projectId: buildingProjectId } : null),
    },
  } as any;
  return new OwnershipService(prisma);
}

describe('OwnershipService project access', () => {
  it('denies a user with no project assignment (removed null bypass)', async () => {
    const svc = makeService();
    await expect(svc.verifyProjectAccess(undefined, 'p1')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.verifyProjectAccess(null, 'p1')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.verifyProjectAccess('', 'p1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows access to the assigned project only', async () => {
    const svc = makeService();
    await expect(svc.verifyProjectAccess('p1', 'p1')).resolves.toBeUndefined();
    await expect(svc.verifyProjectAccess('p1', 'p2')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.verifyProjectAccess('p1', 'P1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows any of the assigned projectIds', async () => {
    const svc = makeService();
    const user = { projectId: 'p1', projectIds: ['p1', 'p2'] };
    await expect(svc.verifyProjectAccess(user, 'p2')).resolves.toBeUndefined();
    await expect(svc.verifyProjectAccess(user, 'p3')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows SUPER_ADMIN across all projects regardless of projectId', async () => {
    const svc = makeService();
    const admin = { projectId: null, projectIds: [], roleNames: ['SUPER_ADMIN'] };
    await expect(svc.verifyProjectAccess(admin, 'any-project')).resolves.toBeUndefined();
  });

  it('does not bypass for a non-admin user with empty roleNames', async () => {
    const svc = makeService();
    await expect(
      svc.verifyProjectAccess({ projectId: null, projectIds: [], roleNames: ['USER'] }, 'p1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('OwnershipService building access', () => {
  it('denies a user with no project assignment', async () => {
    const svc = makeService('p1');
    await expect(svc.verifyBuildingAccess(null, 'b1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('denies access to buildings in other projects', async () => {
    const svc = makeService('p1');
    await expect(svc.verifyBuildingAccess('p2', 'b1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows access to buildings in assigned projects', async () => {
    const svc = makeService('p1');
    await expect(svc.verifyBuildingAccess('p1', 'b1')).resolves.toBeUndefined();
  });

  it('rejects unknown buildings', async () => {
    const svc = makeService();
    await expect(svc.verifyBuildingAccess('p1', 'missing')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows SUPER_ADMIN regardless of project', async () => {
    const svc = makeService('p1');
    const admin = { projectId: null, roleNames: ['SUPER_ADMIN'] };
    await expect(svc.verifyBuildingAccess(admin, 'b1')).resolves.toBeUndefined();
  });
});
