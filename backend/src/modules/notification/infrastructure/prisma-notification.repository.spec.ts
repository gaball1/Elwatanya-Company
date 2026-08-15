import { describe, expect, it, vi } from 'vitest';
import { PrismaNotificationRepository } from './prisma-notification.repository';

const firstCall = (fn: ReturnType<typeof vi.fn>) => (fn.mock.calls[0] ?? [])[0];

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    notification: {
      findMany: vi.fn(async () => []),
      findFirst: vi.fn(async () => null),
      updateMany: vi.fn(async () => ({ count: 0 })),
      upsert: vi.fn(async () => null),
      ...((overrides.notification as Record<string, unknown>) ?? {}),
    },
    ...overrides,
  } as any;
}

function record(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    title: 't',
    titleEn: '',
    message: 'm',
    messageEn: '',
    type: 'info',
    date: new Date('2026-01-01'),
    read: false,
    userId: null,
    entityType: null,
    entityId: null,
    link: null,
    targetRoles: [],
    targetPermissions: [],
    deletedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...over,
  };
}

describe('PrismaNotificationRepository.findAll scoping', () => {
  it('dedicated list: own + plain broadcasts + matching role + matching permission broadcasts', async () => {
    const findMany = vi.fn(async () => []);
    const repo = new PrismaNotificationRepository(makePrisma({ notification: { findMany } }));

    await repo.findAll({
      userId: 'user-1',
      isAdmin: false,
      roleNames: ['HR', 'TECHNICAL_OFFICE'],
      permissionNames: ['approvals.approve'],
    });

    const where = firstCall(findMany).where;
    expect(where.OR).toEqual([
      { userId: 'user-1' },
      { userId: null, targetRoles: { isEmpty: true }, targetPermissions: { isEmpty: true } },
      { userId: null, targetRoles: { hasSome: ['HR', 'TECHNICAL_OFFICE'] } },
      { userId: null, targetPermissions: { hasSome: ['approvals.approve'] } },
    ]);
  });

  it('keeps type/read filters and drops empty role/permission branches', async () => {
    const findMany = vi.fn(async () => []);
    const repo = new PrismaNotificationRepository(makePrisma({ notification: { findMany } }));

    await repo.findAll({ userId: 'user-1', isAdmin: false, type: 'warning', read: false });

    const where = firstCall(findMany).where;
    expect(where.type).toBe('warning');
    expect(where.read).toBe(false);
    expect(where.OR).toHaveLength(2); // own + plain broadcast only
  });

  it('admins bypass scoping entirely', async () => {
    const findMany = vi.fn(async () => []);
    const repo = new PrismaNotificationRepository(makePrisma({ notification: { findMany } }));

    await repo.findAll({ userId: 'user-1', isAdmin: true });

    const where = firstCall(findMany).where;
    expect(where.OR).toBeUndefined();
  });

  it('maps stored targets back into domain objects', async () => {
    const findMany = vi.fn(async () => [
      record('n-1', { targetRoles: ['HR'], targetPermissions: ['x.read'] }),
    ]);
    const repo = new PrismaNotificationRepository(makePrisma({ notification: { findMany } }));

    const list = await repo.findAll({ userId: 'u', isAdmin: false });
    expect(list[0].targetRoles).toEqual(['HR']);
    expect(list[0].targetPermissions).toEqual(['x.read']);
  });
});

describe('PrismaNotificationRepository.markAllAsRead / clearAll scoping', () => {
  it('mark all applies the same dedicated OR-clause for non-admins', async () => {
    const updateMany = vi.fn(async () => ({ count: 3 }));
    const repo = new PrismaNotificationRepository(makePrisma({ notification: { updateMany } }));

    await repo.markAllAsRead('user-1', false, { roleNames: ['ACCOUNTANT'] });

    const args = firstCall(updateMany);
    expect(args.data).toEqual({ read: true });
    expect(args.where.OR).toEqual([
      { userId: 'user-1' },
      { userId: null, targetRoles: { isEmpty: true }, targetPermissions: { isEmpty: true } },
      { userId: null, targetRoles: { hasSome: ['ACCOUNTANT'] } },
    ]);
  });

  it('admins clear everything without an OR-clause', async () => {
    const updateMany = vi.fn(async () => ({ count: 9 }));
    const repo = new PrismaNotificationRepository(makePrisma({ notification: { updateMany } }));

    await repo.clearAll('user-1', true);

    const args = firstCall(updateMany);
    expect(args.where.OR).toBeUndefined();
    expect(args.data.deletedAt).toBeInstanceOf(Date);
  });
});