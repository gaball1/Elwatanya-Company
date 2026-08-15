import { Result } from '@/shared/kernel/result';
import { IAttendanceRepository } from '../../domain/attendance.repository';
import { Attendance } from '../../domain/attendance.entity';
import { CreateAttendanceInput, AttendanceResult } from '../dto/attendance.dto';
import { EventBusImpl } from '@/modules/domain-events/event-bus.impl';
import { PrismaService } from '@/prisma/prisma.service';
import { evaluateGeofence } from '../geofence.util';
import { AttendanceOverrideService } from '@/modules/attendance-override/attendance-override.service';
import { toResult } from './list-attendance.use-case';

export type CreateAttendanceOutcome =
  | { record: AttendanceResult }
  | { override: { id: string; reason: string; status: string; distance: number | null }; requiresApproval: true };

export class CreateAttendanceUseCase {
  constructor(
    private readonly attendance: IAttendanceRepository,
    private readonly eventBus: EventBusImpl,
    private readonly prisma: PrismaService,
    private readonly overrideService: AttendanceOverrideService,
  ) {}

  async execute(input: CreateAttendanceInput): Promise<Result<CreateAttendanceOutcome>> {
    const existing = await this.attendance.findByEmployeeAndDate(input.employeeId, input.date);
    if (existing) {
      return Result.fail(new Error('Attendance record already exists for this employee on this date'));
    }

    // Server-side geofence enforcement: the backend is the source of truth.
    const breach = await this.evaluateGeofence(input.buildingId, input);
    const hasCoords = input.checkInLatitude != null && input.checkInLongitude != null;

    // Inside the site geofence (or no geofence configured) with valid GPS:
    // materialize the attendance record immediately so the employee can check
    // out in the same session (one row per employee + date).
    if (!breach && hasCoords) {
      const record = Attendance.create({
        employeeId: input.employeeId,
        date: input.date,
        checkInTime: input.checkInTime,
        checkInLatitude: input.checkInLatitude,
        checkInLongitude: input.checkInLongitude,
        checkInAddress: input.checkInAddress,
        checkInAccuracy: input.checkInAccuracy,
        checkInSelfie: input.checkInSelfie,
        deviceInfo: input.deviceInfo,
        distanceFromSite: input.distanceFromSite,
        projectId: input.projectId,
        buildingId: input.buildingId,
        notes: input.notes,
      });
      if (record.isFailure) return Result.fail(record.error as Error);
      const attendance = record.getValue();
      await this.attendance.save(attendance);
      return Result.ok({ record: toResult(attendance) });
    }

    // Outside the geofence or missing GPS → submit for manager approval.
    // The attendance record is materialized only after the request is approved.
    const requestedBy = await this.resolveRequestedBy(input.employeeId);

    const { override } = await this.overrideService.create({
      requestedBy: requestedBy ?? input.employeeId,
      reason: breach ? breach.reason : 'Location data missing; check-in requires valid GPS coordinates',
      type: 'check_in',
      distance: breach ? breach.distance : input.distanceFromSite ?? null,
      snapshot: {
        employeeId: input.employeeId,
        date: input.date,
        checkInTime: input.checkInTime,
        checkInLatitude: input.checkInLatitude ?? null,
        checkInLongitude: input.checkInLongitude ?? null,
        checkInAddress: input.checkInAddress ?? null,
        checkInAccuracy: input.checkInAccuracy ?? null,
        checkInSelfie: input.checkInSelfie ?? null,
        deviceInfo: input.deviceInfo ?? null,
        distanceFromSite: input.distanceFromSite ?? null,
        projectId: input.projectId ?? null,
        buildingId: input.buildingId ?? null,
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
    input: CreateAttendanceInput,
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

    const hasCoords = input.checkInLatitude != null && input.checkInLongitude != null;
    if (!hasCoords) {
      return { reason: 'Location data missing; check-in requires valid GPS coordinates', distance: null };
    }

    const result = evaluateGeofence(config, input.checkInLatitude, input.checkInLongitude, input.checkInAccuracy);
    if (!result.inside) {
      return {
        reason: `Check-in location is outside the allowed site radius (${Math.round(result.distance ?? 0)}m > ${config.allowedRadius}m)`,
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
