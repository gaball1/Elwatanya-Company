import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '@/common/services/notification.service';
import { AuditService } from '@/modules/audit/audit.service';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import {
  AttendanceOverrideRequestedEvent,
  AttendanceOverrideApprovedEvent,
  AttendanceOverrideRejectedEvent,
} from '@/modules/domain-events/events';

export interface OverrideSnapshot {
  employeeId?: string | null;
  date?: Date | string | null;
  checkInTime?: Date | string | null;
  checkInLatitude?: number | null;
  checkInLongitude?: number | null;
  checkInAddress?: string | null;
  checkInAccuracy?: number | null;
  checkInSelfie?: string | null;
  checkOutTime?: Date | string | null;
  checkOutLatitude?: number | null;
  checkOutLongitude?: number | null;
  checkOutAddress?: string | null;
  checkOutAccuracy?: number | null;
  checkOutSelfie?: string | null;
  deviceInfo?: string | null;
  distanceFromSite?: number | null;
  projectId?: string | null;
  buildingId?: string | null;
  notes?: string | null;
}

@Injectable()
export class AttendanceOverrideService {
  private readonly MANAGER_ROLES = ['HR', 'CEO', 'TECHNICAL_OFFICE'];

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly audit: AuditService,
    private readonly eventBus: EventBusImpl,
  ) {}

  /**
   * Create an override request. A check-in override may be created BEFORE an
   * attendance record exists (attendance is materialized only after approval).
   * A check-out override references the existing attendance record.
   */
  async create(data: {
    requestedBy: string;
    reason: string;
    type?: 'check_in' | 'check_out';
    attendanceId?: string;
    distance?: number | null;
    snapshot?: OverrideSnapshot;
    auditedBy?: string | null;
    ip?: string;
  }) {
    const type = data.type ?? 'check_in';

    let attendanceId: string | null = null;
    let employeeId: string | null = null;
    let date: Date | null = null;

    if (data.attendanceId) {
      const attendance = await this.prisma.attendance.findFirst({
        where: { id: data.attendanceId, deletedAt: null },
      });
      if (!attendance) throw new NotFoundException('Attendance record not found');
      attendanceId = attendance.id;
      employeeId = attendance.employeeId;
      date = attendance.date;
    } else if (data.snapshot?.employeeId) {
      employeeId = data.snapshot.employeeId;
      date = data.snapshot.date ? new Date(data.snapshot.date) : null;
    }

    if (!employeeId) throw new NotFoundException('Employee not resolved for override request');

    const existingPending = await this.prisma.attendanceOverride.findFirst({
      where: {
        employeeId,
        type,
        status: 'pending',
      },
    });

    let override;
    if (existingPending) {
      // Re-submission: refresh the pending request instead of failing, so the
      // employee can update their reason/snapshot after a rejected or retried flow.
      override = await this.prisma.attendanceOverride.update({
        where: { id: existingPending.id },
        data: {
          reason: data.reason,
          distance: data.distance ?? existingPending.distance,
          payload: (data.snapshot as any) ?? existingPending.payload,
          attendanceId: attendanceId ?? existingPending.attendanceId,
        },
      });
    } else {
      override = await this.prisma.attendanceOverride.create({
        data: {
          attendanceId,
          requestedBy: data.requestedBy,
          approvedBy: null,
          reason: data.reason,
          status: 'pending',
          type,
          distance: data.distance ?? null,
          employeeId,
          date,
          payload: (data.snapshot as any) ?? undefined,
        },
      });
    }

    const requester = employeeId
      ? await this.prisma.employee.findUnique({
          where: { id: employeeId },
          select: { fullName: true },
        })
      : null;

    await this.audit.log({
      userId: data.auditedBy ?? data.requestedBy,
      action: 'attendance-override.requested',
      entity: 'attendanceOverride',
      entityId: override.id,
      metadata: {
        type,
        employeeId,
        distance: data.distance,
        reason: data.reason,
      },
      ip: data.ip,
    });

    const isCheckIn = type === 'check_in';
    await this.notifications.createForRoles(this.MANAGER_ROLES, {
      title: isCheckIn ? 'طلب تسجيل حضور' : 'طلب تسجيل انصراف',
      titleEn: isCheckIn ? 'Attendance Check-in Request' : 'Attendance Check-out Request',
      message: isCheckIn
        ? `طلب تسجيل حضور جديد${requester ? ` من ${requester.fullName}` : ''}: ${data.reason}`
        : `طلب تسجيل انصراف جديد${requester ? ` من ${requester.fullName}` : ''}: ${data.reason}`,
      messageEn: isCheckIn
        ? `New attendance check-in request${requester ? ` by ${requester.fullName}` : ''}: ${data.reason}`
        : `New attendance check-out request${requester ? ` by ${requester.fullName}` : ''}: ${data.reason}`,
      type: 'warning',
      entityType: 'attendance_override',
      entityId: override.id,
      link: '/attendance/overrides',
      createdBy: data.requestedBy,
    });

    await this.eventBus.publish(
      new AttendanceOverrideRequestedEvent(
        override.id,
        'attendance_override',
        {
          id: override.id,
          attendanceId: attendanceId ?? undefined,
          employeeId,
          reason: data.reason,
          recipientIds: (await this.isValidUser(data.requestedBy)) ? [data.requestedBy] : [],
        },
      ),
    );

    return { override };
  }

  async updateReason(id: string, reason: string, updatedBy?: string | null, ip?: string) {
    const existing = await this.prisma.attendanceOverride.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Override request not found');
    if (existing.status !== 'pending') {
      throw new ConflictException('Override request is no longer pending');
    }
    if (!reason || !reason.trim()) {
      throw new BadRequestException('Override reason is required');
    }

    const override = await this.prisma.attendanceOverride.update({
      where: { id },
      data: { reason: reason.trim() },
    });

    await this.audit.log({
      userId: updatedBy ?? existing.requestedBy,
      action: 'attendance-override.reason-updated',
      entity: 'attendanceOverride',
      entityId: override.id,
      metadata: { type: override.type },
      ip,
    });

    return { override };
  }

  async approve(id: string, comment?: string, approvedBy?: string | null, ip?: string) {
    const existing = await this.prisma.attendanceOverride.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Override request not found');
    if (existing.status !== 'pending') {
      throw new NotFoundException('Override request is no longer pending');
    }

    const override = await this.prisma.attendanceOverride.update({
      where: { id },
      data: { status: 'approved' as string, comment: comment ?? undefined, approvedBy },
    });

    await this.materialize(override.type, override, 'approve');

    await this.audit.log({
      userId: approvedBy ?? id,
      action: 'attendance-override.approved',
      entity: 'attendanceOverride',
      entityId: override.id,
      metadata: { type: override.type, comment },
      ip,
    });

    if (existing.requestedBy && (await this.isValidUser(existing.requestedBy))) {
      await this.notifications.createForUser(existing.requestedBy, {
        type: 'success',
        title: 'تمت الموافقة على طلب الحضور',
        titleEn: 'Attendance Request Approved',
        message: 'تمت الموافقة على طلب الحضور الخاص بك',
        messageEn: 'Your attendance request was approved',
        entityType: 'attendance_override',
        entityId: override.id,
        link: '/attendance',
        createdBy: existing.requestedBy,
      });
    }

    await this.eventBus.publish(
      new AttendanceOverrideApprovedEvent(
        override.id,
        'attendance_override',
        {
          id: override.id,
          attendanceId: override.attendanceId ?? undefined,
          employeeId: override.employeeId ?? undefined,
          requestedBy: existing.requestedBy,
          reason: existing.reason,
          comment,
          recipientIds: existing.requestedBy && (await this.isValidUser(existing.requestedBy)) ? [existing.requestedBy] : [],
        },
      ),
    );

    return { override };
  }

  async reject(id: string, comment?: string, approvedBy?: string | null, ip?: string) {
    const existing = await this.prisma.attendanceOverride.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Override request not found');
    if (existing.status !== 'pending') {
      throw new NotFoundException('Override request is no longer pending');
    }

    const override = await this.prisma.attendanceOverride.update({
      where: { id },
      data: { status: 'rejected' as string, comment: comment ?? undefined, approvedBy },
    });

    await this.audit.log({
      userId: approvedBy ?? id,
      action: 'attendance-override.rejected',
      entity: 'attendanceOverride',
      entityId: override.id,
      metadata: { type: override.type, comment },
      ip,
    });

    if (existing.requestedBy && (await this.isValidUser(existing.requestedBy))) {
      await this.notifications.createForUser(existing.requestedBy, {
        type: 'error',
        title: 'تم رفض طلب الحضور',
        titleEn: 'Attendance Request Rejected',
        message: `تم رفض طلب الحضور الخاص بك${comment ? ` - ${comment}` : ''}`,
        messageEn: `Your attendance request was rejected${comment ? ` - ${comment}` : ''}`,
        entityType: 'attendance_override',
        entityId: override.id,
        link: '/attendance',
        createdBy: existing.requestedBy,
      });
    }

    await this.eventBus.publish(
      new AttendanceOverrideRejectedEvent(
        override.id,
        'attendance_override',
        {
          id: override.id,
          attendanceId: override.attendanceId ?? undefined,
          employeeId: override.employeeId ?? undefined,
          requestedBy: existing.requestedBy,
          reason: existing.reason,
          comment,
          recipientIds: existing.requestedBy && (await this.isValidUser(existing.requestedBy)) ? [existing.requestedBy] : [],
        },
      ),
    );

    return { override };
  }

  /**
   * Materializes the underlying effect once an override is approved:
   * - check_in override: create the attendance record from the stored snapshot.
   * - check_out override: apply check-out to the existing attendance record.
   */
  private async materialize(
    type: string,
    override: {
      id: string;
      attendanceId: string | null;
      employeeId: string | null;
      date: Date | null;
      distance: number | null;
      payload: any;
    },
    _outcome: 'approve' | 'reject',
  ): Promise<void> {
    if (type === 'check_in' && !override.attendanceId && override.employeeId && override.date) {
      const p = override.payload ?? {};
      const checkInTime = p.checkInTime ? new Date(p.checkInTime) : new Date();

      const existing = await this.prisma.attendance.findFirst({
        where: { employeeId: override.employeeId, date: override.date, deletedAt: null },
      });

      if (existing) {
        await this.prisma.attendanceOverride.update({
          where: { id: override.id },
          data: { attendanceId: existing.id },
        });
        return;
      }

      // A soft-deleted attendance still holds the unique (employeeId, date) index,
      // so restoring it is required instead of inserting a fresh record.
      const softDeleted = await this.prisma.attendance.findFirst({
        where: { employeeId: override.employeeId, date: override.date, deletedAt: { not: null } },
      });

      if (softDeleted) {
        const restored = await this.prisma.attendance.update({
          where: { id: softDeleted.id },
          data: {
            deletedAt: null,
            checkIn: '',
            checkOut: '',
            status: 'present',
            hoursWorked: 0,
            checkInTime,
            checkInLatitude: p.checkInLatitude ?? null,
            checkInLongitude: p.checkInLongitude ?? null,
            checkInAddress: p.checkInAddress ?? null,
            checkInAccuracy: p.checkInAccuracy ?? null,
            checkInSelfie: p.checkInSelfie ?? null,
            checkOutTime: null,
            checkOutLatitude: null,
            checkOutLongitude: null,
            checkOutAddress: null,
            checkOutAccuracy: null,
            checkOutSelfie: null,
            workedMinutes: null,
            distanceFromSite: p.distanceFromSite ?? override.distance,
            attendanceStatus: 'checkedIn',
            deviceInfo: p.deviceInfo ?? null,
            isSynced: true,
            projectId: p.projectId ?? null,
            buildingId: p.buildingId ?? null,
            notes: p.notes ?? '',
          },
        });

        await this.prisma.attendanceOverride.update({
          where: { id: override.id },
          data: { attendanceId: restored.id },
        });
        return;
      }

      const attendance = await this.prisma.attendance.create({
        data: {
          employeeId: override.employeeId,
          date: override.date,
          checkIn: '',
          checkOut: '',
          status: 'present',
          hoursWorked: 0,
          checkInTime,
          checkInLatitude: p.checkInLatitude ?? null,
          checkInLongitude: p.checkInLongitude ?? null,
          checkInAddress: p.checkInAddress ?? null,
          checkInAccuracy: p.checkInAccuracy ?? null,
          checkInSelfie: p.checkInSelfie ?? null,
          distanceFromSite: p.distanceFromSite ?? override.distance,
          workedMinutes: null,
          attendanceStatus: 'checkedIn',
          deviceInfo: p.deviceInfo ?? null,
          isSynced: true,
          projectId: p.projectId ?? null,
          buildingId: p.buildingId ?? null,
          notes: p.notes ?? '',
        },
      });

      await this.prisma.attendanceOverride.update({
        where: { id: override.id },
        data: { attendanceId: attendance.id },
      });
    }

    if (type === 'check_out') {
      const p = override.payload ?? {};

      let attendanceId = override.attendanceId;
      if (!attendanceId && override.employeeId && override.date) {
        // Fallback: the request may reference an attendance by employee+date
        // when no record id was known at submission time.
        const byEmpDate = await this.prisma.attendance.findFirst({
          where: { employeeId: override.employeeId, date: override.date, deletedAt: null },
        });
        if (byEmpDate) {
          attendanceId = byEmpDate.id;
          await this.prisma.attendanceOverride.update({
            where: { id: override.id },
            data: { attendanceId },
          });
        }
      }

      if (!attendanceId) return;
      const checkOutTime = p.checkOutTime ? new Date(p.checkOutTime) : new Date();
      const attendance = await this.prisma.attendance.findFirst({
        where: { id: attendanceId, deletedAt: null },
      });
      if (!attendance || !attendance.checkInTime) return;
      if (attendance.checkOutTime) return;

      const workedMin = Math.round(
        (checkOutTime.getTime() - new Date(attendance.checkInTime).getTime()) / 60000,
      );
      const hh = String(checkOutTime.getHours()).padStart(2, '0');
      const mm = String(checkOutTime.getMinutes()).padStart(2, '0');

      await this.prisma.attendance.update({
        where: { id: attendanceId },
        data: {
          checkOutTime,
          checkOutLatitude: p.checkOutLatitude ?? attendance.checkOutLatitude,
          checkOutLongitude: p.checkOutLongitude ?? attendance.checkOutLongitude,
          checkOutAddress: p.checkOutAddress ?? attendance.checkOutAddress,
          checkOutAccuracy: p.checkOutAccuracy ?? attendance.checkOutAccuracy,
          checkOutSelfie: p.checkOutSelfie ?? attendance.checkOutSelfie,
          workedMinutes: workedMin,
          distanceFromSite: p.distanceFromSite ?? attendance.distanceFromSite,
          attendanceStatus: 'checkedOut',
          checkOut: `${hh}:${mm}`,
          hoursWorked: Math.round((workedMin / 60) * 100) / 100,
          status: 'present',
        },
      });
    }
  }

  async findMine(employeeId: string | null | undefined) {
    if (!employeeId) return { overrides: [] };
    const overrides = await this.prisma.attendanceOverride.findMany({
      where: { employeeId },
      include: {
        attendance: true,
        employee: { select: { id: true, fullName: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { overrides };
  }

  async findAll(status?: string) {
    const where: any = {};
    if (status) where.status = status;

    const overrides = await this.prisma.attendanceOverride.findMany({
      where,
      include: {
        attendance: true,
        employee: { select: { id: true, fullName: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { overrides };
  }

  private async isValidUser(userId: string | null | undefined): Promise<boolean> {
    if (!userId) return false;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    return user !== null;
  }
}