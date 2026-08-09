import { Result } from '@/shared/kernel/result';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { IAttendanceRepository } from '../../domain/attendance.repository';
import { CheckOutInput, AttendanceResult } from '../dto/attendance.dto';
import { toResult } from './list-attendance.use-case';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { AttendanceCheckedOutEvent } from '@/modules/domain-events/events';
import { PrismaService } from '@/prisma/prisma.service';
import { evaluateGeofence } from '../geofence.util';
import { AttendanceOverrideService } from '@/modules/attendance-override/attendance-override.service';

export type CheckOutOutcome =
  | { record: AttendanceResult }
  | { override: { id: string; reason: string; status: string; distance: number | null }; requiresApproval: true };

export class CheckOutUseCase {
  constructor(
    private readonly attendance: IAttendanceRepository,
    private readonly eventBus: EventBusImpl,
    private readonly prisma: PrismaService,
    private readonly overrideService: AttendanceOverrideService,
  ) {}

  async execute(input: CheckOutInput): Promise<Result<CheckOutOutcome>> {
    const entity = await this.attendance.findById(new UniqueEntityId(input.id));
    if (!entity) return Result.fail(new Error('Attendance record not found'));

    // Server-side geofence enforcement on check-out.
    const breach = await this.evaluateGeofence(entity.buildingId, input);
    if (breach) {
      const requestedBy = await this.resolveRequestedBy(entity.employeeId);
      const { override } = await this.overrideService.create({
        requestedBy: requestedBy ?? entity.employeeId,
        reason: breach.reason,
        type: 'check_out',
        attendanceId: entity.id.toValue(),
        distance: breach.distance,
        snapshot: {
          employeeId: entity.employeeId,
          date: entity.date,
          checkOutTime: input.checkOutTime,
          checkOutLatitude: input.checkOutLatitude ?? null,
          checkOutLongitude: input.checkOutLongitude ?? null,
          checkOutAddress: input.checkOutAddress ?? null,
          checkOutAccuracy: input.checkOutAccuracy ?? null,
          checkOutSelfie: input.checkOutSelfie ?? null,
          notes: input.notes ?? null,
        },
      });

      return Result.ok({
        override: { id: override.id, reason: override.reason, status: override.status, distance: breach.distance },
        requiresApproval: true,
      });
    }

    const result = entity.doCheckOut({
      checkOutTime: input.checkOutTime,
      checkOutLatitude: input.checkOutLatitude,
      checkOutLongitude: input.checkOutLongitude,
      checkOutAddress: input.checkOutAddress,
      checkOutAccuracy: input.checkOutAccuracy,
      checkOutSelfie: input.checkOutSelfie,
      distanceFromSite: input.distanceFromSite,
      notes: input.notes,
    });

    if (result.isFailure) return Result.fail(result.error as Error);

    await this.attendance.save(entity);

    if (entity.employeeId) {
      const user = await this.prisma.user.findUnique({
        where: { employeeId: entity.employeeId },
        select: { id: true },
      });
      const employee = await this.prisma.employee.findUnique({
        where: { id: entity.employeeId },
        select: { fullName: true },
      });
      await this.eventBus.publish(
        new AttendanceCheckedOutEvent(
          entity.id.toValue(),
          'attendance',
          {
            id: entity.id.toValue(),
            employeeId: entity.employeeId,
            employeeName: employee?.fullName,
            checkInTime: entity.checkInTime?.toISOString() ?? '',
            checkOutTime: input.checkOutTime.toISOString(),
            workedMinutes: entity.workedMinutes ?? 0,
            recipientIds: user ? [user.id] : [],
          },
        ),
      );
    }

    return Result.ok({ record: toResult(entity) });
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
}