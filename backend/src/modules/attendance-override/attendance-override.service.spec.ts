import { describe, expect, it, vi } from 'vitest';
import { AttendanceOverrideService } from './attendance-override.service';

function makeOverrides(onCall: Record<string, (args: any) => any>) {
  return {
    findFirst: vi.fn(async (args: any) => onCall.findFirst?.(args) ?? null),
    findUnique: vi.fn(async (args: any) => onCall.findUnique?.(args) ?? null),
    update: vi.fn(async (args: any) => onCall.update?.(args) ?? {}),
    create: vi.fn(async (args: any) => onCall.create?.(args) ?? {}),
  };
}

function makePrisma(overrides: any, attendance: any, users: any) {
  return {
    attendanceOverride: overrides,
    attendance: {
      findFirst: vi.fn(async (args: any) => attendance.findFirst?.(args) ?? null),
      update: vi.fn(async (args: any) => attendance.update?.(args) ?? {}),
    },
    employee: { findUnique: vi.fn(async () => ({ fullName: 'موظف' })) },
    user: { findUnique: vi.fn(async (args: any) => (users.find ? users.find(args) : { id: args.where.id })) },
  };
}

function makeService(prisma: any, notifications?: any, audit?: any, eventBus?: any) {
  return new AttendanceOverrideService(
    prisma,
    notifications ?? { createForRoles: vi.fn(async () => undefined), createForUser: vi.fn(async () => undefined) },
    audit ?? { log: vi.fn(async () => undefined) },
    eventBus ?? { publish: vi.fn(async () => undefined) },
  );
}

describe('AttendanceOverrideService.create', () => {
  it('re-submits into the existing pending request instead of failing', async () => {
    const update = vi.fn(async (args: any) => ({ id: 'ov-1' }));
    const create = vi.fn(async () => null);
    const overrides = makeOverrides({
      findFirst: async () => ({ id: 'ov-1', distance: 5, payload: { old: true } }),
      update,
    });
    const overrides2 = { ...overrides, create };
    const notifications = { createForRoles: vi.fn(async () => undefined) };
    const audit = { log: vi.fn(async () => undefined) };
    const eventBus = { publish: vi.fn(async () => undefined) };
    const prisma = makePrisma(overrides2, {}, { find: () => ({ id: 'user-1' }) });
    const svc = makeService(prisma, notifications, audit, eventBus);

    await svc.create({
      requestedBy: 'user-1',
      reason: 'انقطاع الكهرباء',
      type: 'check_in',
      snapshot: { employeeId: 'emp-1', date: new Date('2026-01-01') },
    });

    expect(overrides.findFirst).toHaveBeenCalledWith({
      where: { employeeId: 'emp-1', type: 'check_in', status: 'pending' },
    });
    expect(update).toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'attendance-override.requested' }));
    expect(notifications.createForRoles).toHaveBeenCalledWith(
      ['HR', 'CEO', 'TECHNICAL_OFFICE'],
      expect.anything(),
    );
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
  });

  it('throws when no employee can be resolved', async () => {
    const prisma = makePrisma(makeOverrides({}), {}, {});
    const svc = makeService(prisma);
    await expect(
      svc.create({ requestedBy: 'user-1', reason: 'x', type: 'check_in' }),
    ).rejects.toThrow('Employee not resolved');
  });

  it('throws when a referenced attendance record is missing', async () => {
    const prisma = makePrisma(makeOverrides({}), { findFirst: () => null }, {});
    const svc = makeService(prisma);
    await expect(
      svc.create({ requestedBy: 'user-1', reason: 'x', type: 'check_out', attendanceId: 'att-missing' }),
    ).rejects.toThrow('Attendance record not found');
  });
});

describe('AttendanceOverrideService.approve (check_out -> same-row update)', () => {
  const existing = {
    id: 'ov-2',
    type: 'check_out',
    status: 'pending',
    attendanceId: 'att-1',
    employeeId: 'emp-1',
    date: new Date('2026-01-01'),
    distance: 123,
    payload: { checkOutTime: '2026-01-01T17:00:00.000Z' },
    requestedBy: 'user-1',
    reason: 'انتهت الوردية',
    comment: null,
  };

  it('writes check-out back into the same attendance row', async () => {
    const attendanceUpdate = vi.fn(async (_args: any) => ({}));
    const overrides = makeOverrides({
      findUnique: () => existing,
      update: (args: any) => ({ ...existing, ...args.data }),
    });
    const attendance = {
      findFirst: async (args: any) =>
        args?.where?.id === 'att-1'
          ? {
              id: 'att-1',
              checkInTime: new Date('2026-01-01T08:00:00.000Z'),
              checkOutLatitude: null,
              checkOutLongitude: null,
              checkOutAddress: null,
              checkOutAccuracy: null,
              checkOutSelfie: null,
              distanceFromSite: null,
            }
          : null,
      update: attendanceUpdate,
    };
    const prisma = makePrisma(overrides, attendance, { find: () => ({ id: 'user-1' }) });
    const notifications = { createForUser: vi.fn(async () => undefined) };
    const svc = makeService(prisma, notifications);

    await svc.approve('ov-2', 'ok', 'manager-1', '127.0.0.1');

    expect(prisma.attendance.findFirst).toHaveBeenCalledWith({ where: { id: 'att-1', deletedAt: null } });
    const data = attendanceUpdate.mock.calls[0][0].data;
    expect(data.attendanceStatus).toBe('checkedOut');
    expect(data.status).toBe('present');
    expect(data.workedMinutes).toBe(540); // 08:00 -> 17:00
    expect(data.hoursWorked).toBe(9);
    const out = new Date('2026-01-01T17:00:00.000Z'); // local-time rendering is tz-dependent
    const hh = String(out.getHours()).padStart(2, '0');
    const mm = String(out.getMinutes()).padStart(2, '0');
    expect(data.checkOut).toBe(`${hh}:${mm}`);
    expect(notifications.createForUser).toHaveBeenCalledWith('user-1', expect.anything());
  });

  it('leaves the row untouched when check-out already applied or unchecked-in', async () => {
    const attendanceUpdate = vi.fn(async (_args: any) => ({}));
    const alreadyOut = vi.fn(async () => ({}));
    const overrides = makeOverrides({
      findUnique: () => existing,
      update: (args: any) => ({ ...existing, ...args.data }),
    });
    const prisma = makePrisma(
      overrides,
      {
        findFirst: () => ({ id: 'att-1', checkInTime: new Date('2026-01-01T08:00:00Z'), checkOutTime: new Date('2026-01-01T16:00:00Z') }),
        update: alreadyOut,
      },
      { find: () => ({ id: 'user-1' }) },
    );
    const svc = makeService(prisma);

    // attendance has checkOutTime already -> materialize returns early (no second update)
    await svc.approve('ov-2');
    // The only update calls go through the ones in approve() itself; the final row update is skipped.
    const terminalUpdates = alreadyOut.mock.calls.length;
    expect(terminalUpdates).toBe(0);
  });

  it('rejects approval of a non-pending request', async () => {
    const overrides = makeOverrides({
      findUnique: () => ({ ...existing, status: 'approved' }),
    });
    const prisma = makePrisma(overrides, {}, {});
    const svc = makeService(prisma);
    await expect(svc.approve('ov-2')).rejects.toThrow('no longer pending');
  });
});

describe('AttendanceOverrideService.updateReason', () => {
  it('rejects empty reasons', async () => {
    const prisma = makePrisma(makeOverrides({ findUnique: () => ({ status: 'pending' }) }), {}, {});
    const svc = makeService(prisma);
    await expect(svc.updateReason('ov-1', '   ')).rejects.toThrow('reason is required');
  });

  it('rejects updates to non-pending requests', async () => {
    const prisma = makePrisma(makeOverrides({ findUnique: () => ({ status: 'rejected' }) }), {}, {});
    const svc = makeService(prisma);
    await expect(svc.updateReason('ov-1', 'سبب')).rejects.toThrow('no longer pending');
  });
});