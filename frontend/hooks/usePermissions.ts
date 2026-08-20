import { useMemo } from 'react';
import { useUser } from '@/hooks/useUser';

export function usePermissions(): string[] {
  const { user } = useUser();
  return useMemo(() => user?.permissions ?? [], [user]);
}

export function useRoleNames(): string[] {
  const { user } = useUser();
  return useMemo(() => user?.roleNames ?? [], [user]);
}

const WRITE_ACTIONS = ['create', 'update', 'delete'];

function permissionSatisfied(permissions: string[], permission: string): boolean {
  if (permissions.includes(permission)) return true;
  // Fallback: a granular action is implied by the module `.write` permission.
  // e.g. `employer-boq.create` is satisfied when `employer-boq.write` is granted.
  const idx = permission.lastIndexOf('.');
  if (idx === -1) return false;
  const action = permission.slice(idx + 1);
  if (!WRITE_ACTIONS.includes(action)) return false;
  return permissions.includes(`${permission.slice(0, idx)}.write`);
}

export function useHasPermission(permission: string): boolean {
  const permissions = usePermissions();
  const roleNames = useRoleNames();
  return useMemo(
    () => roleNames.includes('SUPER_ADMIN') || permissionSatisfied(permissions, permission),
    [permissions, permission, roleNames],
  );
}

export function useHasAllPermissions(...required: string[]): boolean {
  const permissions = usePermissions();
  const roleNames = useRoleNames();
  return useMemo(
    () => roleNames.includes('SUPER_ADMIN') || required.every((p) => permissionSatisfied(permissions, p)),
    [permissions, required, roleNames],
  );
}

export function useHasAnyPermission(...required: string[]): boolean {
  const permissions = usePermissions();
  const roleNames = useRoleNames();
  return useMemo(
    () => roleNames.includes('SUPER_ADMIN') || required.some((p) => permissionSatisfied(permissions, p)),
    [permissions, required, roleNames],
  );
}
