import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IAttendanceRepository } from '../../domain/attendance.repository';
import { CheckOutInput, AttendanceResult } from '../dto/attendance.dto';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { PrismaService } from '@/prisma/prisma.service';
import { evaluateGeofence } from '../geofence.util';
import { AttendanceOverrideService } from '@/modules/attendance-override/attendance-override.service';
import { NotificationService } from '@/common/services/notification.service';
import { toResult } from './list-attendance.use-case';

export type CheckOutOutcome =
  | { record: AttendanceResult }
  | { override: { id: string; reason: string; status: string; distance: number | null }; requiresApproval: true };

export class CheckOutUseCase {
  private readonly MANAGER_ROLES = ['HR', 'CEO', 'TECHNICAL_OFFICE'];

  constructor(
    private readonly attendance: IAttendanceRepository,
    private readonly eventBus: EventBusImpl,
    private readonly prisma: PrismaService,
    private readonly overrideService: AttendanceOverrideService,
    private readonly notifications: NotificationService,
  ) {}

  async execute(input: CheckOutInput): Promise<Result<CheckOutOutcome>> {
    const entity = await this.attendance.findById(new UniqueEntityId(input.id));
    if (!entity) return Result.fail(new Error('Attendance record not found'));

    // Server-side geofence enforcement on check-out.
    const breach = await this.evaluateGeofence(entity.buildingId, input);
    const hasCoords = input.checkOutLatitude != null && input.checkOutLongitude != null;

    // Inside the geofence (or no geofence configured) with valid GPS:
    // apply the check-out to the same attendance record so check-in and
    // check-out live in the same row for the same employee + date.
    if (!breach && hasCoords) {
      const applied = entity.doCheckOut({
        checkOutTime: input.checkOutTime,
        checkOutLatitude: input.checkOutLatitude,
        checkOutLongitude: input.checkOutLongitude,
        checkOutAddress: input.checkOutAddress,
        checkOutAccuracy: input.checkOutAccuracy,
        checkOutSelfie: input.checkOutSelfie,
        distanceFromSite: input.distanceFromSite,
        notes: input.notes,
      });
      if (applied.isFailure) return Result.fail(applied.error as Error);
      await this.attendance.save(entity);
      void this.notifyManagers(entity.employeeId, entity.projectId, entity.buildingId);
      return Result.ok({ record: toResult(entity) });
    }

    // Outside the geofence or missing GPS → submit for manager approval.
    const requestedBy = await this.resolveRequestedBy(entity.employeeId);

    const { override } = await this.overrideService.create({
      requestedBy: requestedBy ?? entity.employeeId,
      reason: breach ? breach.reason : 'Location data missing; check-out requires valid GPS coordinates',
      type: 'check_out',
      attendanceId: entity.id.toValue(),
      distance: breach ? breach.distance : input.distanceFromSite ?? null,
      snapshot: {
        employeeId: entity.employeeId,
        date: entity.date,
        checkOutTime: input.checkOutTime,
        checkOutLatitude: input.checkOutLatitude ?? null,
        checkOutLongitude: input.checkOutLongitude ?? null,
        checkOutAddress: input.checkOutAddress ?? null,
        checkOutAccuracy: input.checkOutAccuracy ?? null,
        checkOutSelfie: input.checkOutSelfie ?? null,
        distanceFromSite: input.distanceFromSite ?? null,
        notes: input.notes ?? null,
      },
    });

    return Result.ok({
      override: {
        id: override.id,
        reason: override.reason,
        status: override.status,
        distance: breach ? breach.distance : input.distanceFromSite ?? null,
      },
      requiresApproval: true,
    });
  }

  private async evaluateGeofence(
    buildingId: string | null | undefined,
    input: CheckOutInput,
  ): Promise<{ reason: string; distance: number | null } | null> {
    if (!buildingId) return null;

    const building = await this.prisma.building.findFirst({
      where: { id: buildingId, deletedAt: null },
    });
    if (!building || building.latitude == null || building.longitude == null) return null;

    const config = {
      latitude: building.latitude,
      longitude: building.longitude,
      allowedRadius: building.allowedRadius ?? 100,
    };

    const hasCoords = input.checkOutLatitude != null && input.checkOutLongitude != null;
    if (!hasCoords) {
      return { reason: 'Location data missing; check-out requires valid GPS coordinates', distance: null };
    }

    const result = evaluateGeofence(config, input.checkOutLatitude, input.checkOutLongitude, input.checkOutAccuracy);
    if (!result.inside) {
      return {
        reason: `Check-out location is outside the allowed site radius (${Math.round(result.distance ?? 0)}m > ${config.allowedRadius}m)`,
        distance: result.distance,
      };
    }
    return null;
  }

  private async resolveRequestedBy(employeeId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { employeeId },
      select: { id: true },
    });
    return user?.id ?? null;
  }

  private async notifyManagers(
    employeeId: string,
    projectId?: string | null,
    buildingId?: string | null,
  ): Promise<void> {
    try {
      const employee = await this.prisma.employee.findUnique({
        where: { id: employeeId },
        select: { fullName: true, code: true },
      });
      const label = employee?.fullName ?? employeeId;
      const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo' });

      const link = projectId && buildingId
        ? `/projects/${projectId}/buildings/${buildingId}/attendance`
        : '/attendance/history';

      await this.notifications.createForRoles(this.MANAGER_ROLES, {
        title: 'تسجيل انصراف',
        titleEn: 'Attendance Check-out',
        message: `${label} — ${timeStr}`,
        messageEn: `${label} — ${timeStr}`,
        type: 'info',
        entityType: 'attendance',
        entityId: employeeId,
        link,
        createdBy: employeeId,
      });
    } catch {
      // notification failure must never break attendance flow
    }
  }
}
