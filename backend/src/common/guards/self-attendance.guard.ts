import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest } from '../decorators/current-user.decorator';

export const SELF_ATTENDANCE_KEY = 'selfAttendancePermission';

/**
 * Marks a route as self-service attendance: authenticated users with a linked
 * employee may record their own attendance without attendance permissions,
 * while privileged users (admin/HR/officers) still need the declared permission.
 */
export const SelfAttendance = (permission: string) => SetMetadata(SELF_ATTENDANCE_KEY, permission);

@Injectable()
export class SelfAttendanceGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string>(SELF_ATTENDANCE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user) return false;

    // SUPER_ADMIN bypasses all permission checks
    if (user.roleNames?.includes('SUPER_ADMIN')) return true;

    // Self-service: any authenticated user with a linked employee may record
    // their own attendance without attendance.create/update permissions.
    if (user.employeeId) return true;

    // Privileged path: require the declared permission (HR, attendance officers, ...)
    if (required && user.permissions?.includes(required)) return true;

    return false;
  }
}
