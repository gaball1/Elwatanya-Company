import { describe, expect, it, vi } from 'vitest';
import { ListNotificationsUseCase } from './list-notifications.use-case';
import { INotificationRepository } from '../../domain/notification.repository';
import { Notification } from '../../domain/notification.entity';

function makeRepo(overrides: Partial<INotificationRepository> = {}): INotificationRepository {
  return {
    save: vi.fn(async () => undefined),
    findById: vi.fn(async () => null),
    findAll: vi.fn(async () => []),
    countUnread: vi.fn(async () => 0),
    markAllAsRead: vi.fn(async () => 0),
    clearAll: vi.fn(async () => 0),
    ...overrides,
  };
}

function notif(userId: string | null, targets: { targetRoles?: string[]; targetPermissions?: string[] } = {}) {
  return Notification.create({
    title: 't',
    message: 'm',
    userId,
    targetRoles: targets.targetRoles,
    targetPermissions: targets.targetPermissions,
  }).getValue();
}

describe('ListNotificationsUseCase', () => {
  it('forwards the requesting user roles and permissions to the repository', async () => {
    const repo = makeRepo();
    const uc = new ListNotificationsUseCase(repo);

    await uc.execute('user-1', false, { roleNames: ['HR'], permissionNames: ['approvals.read'] });

    expect(repo.findAll).toHaveBeenCalledWith({
      userId: 'user-1',
      isAdmin: false,
      roleNames: ['HR'],
      permissionNames: ['approvals.read'],
    });
  });

  it('keeps type/read filters combined with scoping', async () => {
    const repo = makeRepo();
    const uc = new ListNotificationsUseCase(repo);

    await uc.execute('user-1', false, { type: 'warning', read: false, roleNames: [] });

    expect(repo.findAll).toHaveBeenCalledWith({
      userId: 'user-1',
      isAdmin: false,
      roleNames: [],
      permissionNames: undefined,
      type: 'warning',
      read: false,
    });
  });

  it('forwards limit to the repository', async () => {
    const repo = makeRepo();
    const uc = new ListNotificationsUseCase(repo);

    await uc.execute('user-1', true, { limit: 20 });

    expect(repo.findAll).toHaveBeenCalledWith({
      userId: 'user-1',
      isAdmin: true,
      roleNames: undefined,
      permissionNames: undefined,
      limit: 20,
    });
  });

  it('admins pass through without role scoping', async () => {
    const repo = makeRepo();
    const uc = new ListNotificationsUseCase(repo);

    await uc.execute('user-1', true, {});

    expect(repo.findAll).toHaveBeenCalledWith({
      userId: 'user-1',
      isAdmin: true,
      roleNames: undefined,
      permissionNames: undefined,
    });
  });

  it('maps domain notifications to results including targets', async () => {
    const repo = makeRepo({
      findAll: vi.fn(async () => [notif(null, { targetRoles: ['HR'] })]),
    });
    const uc = new ListNotificationsUseCase(repo);

    const result = await uc.execute('user-1', false, { roleNames: ['HR'] });

    const item = result.getValue()[0];
    expect(item.targetRoles).toEqual(['HR']);
    expect(item.targetPermissions).toEqual([]);
    expect(item.userId).toBeNull();
  });
});