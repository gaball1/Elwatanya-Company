import { UserRole } from '@prisma/client';

export { UserRole };

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.CEO]: 100,
  [UserRole.TECHNICAL_OFFICE]: 80,
  [UserRole.ACCOUNTANT]: 70,
  [UserRole.SITE_ENGINEER]: 60,
  [UserRole.STORE_MANAGER]: 50,
  [UserRole.EMPLOYEE]: 10,
};

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.CEO]: ['*'],
  [UserRole.TECHNICAL_OFFICE]: [
    'projects:read',
    'projects:write',
    'buildings:read',
    'buildings:write',
    'boq:read',
    'boq:write',
    'statements:read',
    'extracts:read',
  ],
  [UserRole.SITE_ENGINEER]: [
    'projects:read',
    'buildings:read',
    'boq:read',
    'extracts:read',
    'extracts:write',
    'attendance:read',
    'attendance:write',
  ],
  [UserRole.ACCOUNTANT]: [
    'projects:read',
    'treasury:read',
    'treasury:write',
    'fund:read',
    'fund:write',
    'extracts:read',
    'extracts:approve',
    'statements:read',
    'statements:approve',
    'payments:read',
    'payments:write',
  ],
  [UserRole.STORE_MANAGER]: [
    'projects:read',
    'inventory:read',
    'inventory:write',
    'suppliers:read',
    'suppliers:write',
    'purchases:read',
    'purchases:write',
  ],
  [UserRole.EMPLOYEE]: [],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (permissions.includes('*')) return true;
  return permissions.includes(permission);
}

export function canAccessProject(
  role: UserRole,
  userProjectId: string | null | undefined,
  targetProjectId: string,
): boolean {
  if (
    role === UserRole.CEO ||
    role === UserRole.TECHNICAL_OFFICE ||
    role === UserRole.ACCOUNTANT
  ) {
    return true;
  }
  if (role === UserRole.SITE_ENGINEER || role === UserRole.STORE_MANAGER) {
    return userProjectId === targetProjectId;
  }
  return false;
}
