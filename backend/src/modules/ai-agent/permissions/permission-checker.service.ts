import { Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class PermissionCheckerService {
  hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    return userPermissions.includes(requiredPermission);
  }

  hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.some((p) => userPermissions.includes(p));
  }

  checkOrThrow(user: { permissions: string[] }, requiredPermission: string): void {
    if (!this.hasPermission(user.permissions, requiredPermission)) {
      throw new ForbiddenException(
        `You don't have permission: ${requiredPermission}. Contact your administrator.`,
      );
    }
  }

  getMissingPermissions(userPermissions: string[], requiredPermissions: string[]): string[] {
    return requiredPermissions.filter((p) => !userPermissions.includes(p));
  }
}
