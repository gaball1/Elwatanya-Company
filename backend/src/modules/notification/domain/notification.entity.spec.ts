import { describe, expect, it } from 'vitest';
import { Notification } from './notification.entity';

describe('Notification.create', () => {
  it('creates an untargeted broadcast by default', () => {
    const n = Notification.create({ title: 't', message: 'm', userId: null }).getValue();
    expect(n.userId).toBeNull();
    expect(n.targetRoles).toEqual([]);
    expect(n.targetPermissions).toEqual([]);
  });

  it('keeps personal notifications for a specific user', () => {
    const n = Notification.create({ title: 't', message: 'm', userId: 'user-1' }).getValue();
    expect(n.userId).toBe('user-1');
  });

  it('deduplicates and trims role/permission targets', () => {
    const n = Notification.create({
      title: 't',
      message: 'm',
      userId: null,
      targetRoles: ['TECHNICAL_OFFICE', 'TECHNICAL_OFFICE', ' ', 'ACCOUNTANT'],
      targetPermissions: ['approvals.approve', 'approvals.approve'],
    }).getValue();
    expect(n.targetRoles).toEqual(['TECHNICAL_OFFICE', 'ACCOUNTANT']);
    expect(n.targetPermissions).toEqual(['approvals.approve']);
  });

  it('rejects empty title/message and invalid types', () => {
    expect(Notification.create({ title: ' ', message: 'm' }).isFailure).toBe(true);
    expect(Notification.create({ title: 't', message: '' }).isFailure).toBe(true);
    expect(Notification.create({ title: 't', message: 'm', type: 'pizza' }).isFailure).toBe(true);
  });
});

describe('Notification.isVisibleTo', () => {
  const base = {
    title: 't',
    message: 'm',
    userId: null as string | null,
  };

  it('untargeted broadcast is visible to everyone', () => {
    const n = Notification.create(base).getValue();
    expect(n.isVisibleTo([], [])).toBe(true);
    expect(n.isVisibleTo(['HR'], ['x.read'])).toBe(true);
  });

  it('role-targeted broadcast is visible only to role members', () => {
    const n = Notification.create({ ...base, targetRoles: ['TECHNICAL_OFFICE', 'HR'] }).getValue();
    expect(n.isVisibleTo(['HR'], [])).toBe(true);
    expect(n.isVisibleTo([], ['anything.read'])).toBe(false);
    expect(n.isVisibleTo(['ACCOUNTANT'], [])).toBe(false);
  });

  it('permission-targeted broadcast is visible only to permission holders', () => {
    const n = Notification.create({ ...base, targetPermissions: ['approvals.approve'] }).getValue();
    expect(n.isVisibleTo([], ['approvals.approve'])).toBe(true);
    expect(n.isVisibleTo(['SUPER_ADMIN'], [])).toBe(false);
  });

  it('a personal notification is visible to its owner regardless of targets', () => {
    const n = Notification.create({ ...base, userId: 'user-1', targetRoles: ['HR'] }).getValue();
    expect(n.isVisibleTo([], [])).toBe(true);
  });
});

describe('Notification.markAsRead / softDelete', () => {
  it('marks read once and rejects double-marking', () => {
    const n = Notification.create({ title: 't', message: 'm' }).getValue();
    expect(n.markAsRead().isSuccess).toBe(true);
    expect(n.read).toBe(true);
    expect(n.markAsRead().isFailure).toBe(true);
  });

  it('blocks mutations on deleted notifications', () => {
    const n = Notification.create({ title: 't', message: 'm' }).getValue();
    n.softDelete();
    expect(n.isDeleted).toBe(true);
    expect(n.markAsRead().isFailure).toBe(true);
    expect(n.softDelete().isFailure).toBe(true);
  });
});